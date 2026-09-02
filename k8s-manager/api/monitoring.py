"""Prometheus metrics for the hamamooz backend.

Exposes a lightweight /metrics endpoint using prometheus_client, avoiding
the Django version constraints of django-prometheus (which only supports
Django < 6.1).
"""

import time
from contextlib import contextmanager
from functools import wraps

from django.http import HttpResponse

from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)

# HTTP request metrics (per method/status/path)
REQUESTS_TOTAL = Counter(
    "hamamooz_http_requests_total",
    "Total HTTP requests.",
    ["method", "status", "path"],
)

REQUEST_LATENCY = Histogram(
    "hamamooz_http_request_duration_seconds",
    "HTTP request latency in seconds.",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

# Application domain metrics
CLUSTERS_TOTAL = Gauge(
    "hamamooz_clusters_total",
    "Number of registered clusters.",
)
NAMESPACES_TOTAL = Gauge(
    "hamamooz_namespaces_total",
    "Number of namespaces in registered clusters.",
)
APPS_TOTAL = Gauge(
    "hamamooz_apps_total",
    "Number of apps (deployments) across all namespaces.",
)
BACKUPS_TOTAL = Gauge(
    "hamamooz_backups_total",
    "Number of backup records.",
)
BACKUPS_BY_STATUS = Gauge(
    "hamamooz_backups_by_status",
    "Number of backups by status.",
    ["status"],
)

# Kubernetes operation metrics
K8S_OPERATIONS_TOTAL = Counter(
    "hamamooz_kubernetes_operations_total",
    "Total number of Kubernetes operations by resource/operation/outcome.",
    ["resource", "operation", "outcome"],
)

K8S_OPERATION_DURATION = Histogram(
    "hamamooz_kubernetes_operation_duration_seconds",
    "Duration of Kubernetes operations in seconds.",
    ["resource", "operation"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
)

# Backup metrics
BACKUP_JOBS_TOTAL = Gauge(
    "hamamooz_backup_jobs_total",
    "Number of backup jobs that reached a terminal outcome.",
    ["outcome"],
)

BACKUP_DURATION_SECONDS = Histogram(
    "hamamooz_backup_duration_seconds",
    "Duration of backup operations in seconds.",
    buckets=(1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600),
)

BACKUPS_IN_PROGRESS = Gauge(
    "hamamooz_backups_in_progress",
    "Number of backup jobs currently running.",
)


def reset_histogram(histogram):
    """Reset a label-less histogram's accumulated state to zero.

    Used for DB-derived snapshots that are rebuilt on every scrape (the
    standard Histogram accumulates across scrapes, which would otherwise
    inflate counts for gauge-like values). Relies on prometheus_client
    internals for the fixed 0.26.x layout.
    """
    histogram._sum.set(0)
    for bucket in histogram._buckets:
        bucket.set(0)


@contextmanager
def k8s_op_metric(resource, operation):
    """Context manager that counts a K8s operation and records its duration.

    Usage::

        with k8s_op_metric("namespace", "create"):
            k8s.create_namespace(body=body)
    """
    start = time.perf_counter()
    ok = False
    try:
        yield
        ok = True
    finally:
        outcome = "success" if ok else "error"
        K8S_OPERATIONS_TOTAL.labels(
            resource=resource,
            operation=operation,
            outcome=outcome,
        ).inc()
        K8S_OPERATION_DURATION.labels(
            resource=resource,
            operation=operation,
        ).observe(time.perf_counter() - start)


def k8s_operation(resource, operation):
    """Count a Kubernetes operation by outcome and record its duration.

    ``resource`` is one of: cluster, namespace, app.
    ``operation`` is one of: create, list, update, delete.

    Apply to a Django view (or any callable) that performs a single
    Kubernetes operation. The operation is counted as ``success`` when the
    wrapped callable returns normally with a 2xx/3xx response, and as
    ``error`` when it raises or returns a 4xx/5xx response.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                outcome = "success"
                status_code = getattr(result, "status_code", 200)
                if 400 <= status_code < 600:
                    outcome = "error"
            except Exception:
                outcome = "error"
                raise
            finally:
                K8S_OPERATIONS_TOTAL.labels(
                    resource=resource,
                    operation=operation,
                    outcome=outcome,
                ).inc()
                K8S_OPERATION_DURATION.labels(
                    resource=resource,
                    operation=operation,
                ).observe(time.perf_counter() - start)
            return result
        return wrapper
    return decorator


def k8s_inc(resource, operation, ok):
    """Lightweight inline counter for a Kubernetes operation outcome.

    Use at the call site of an actual Kubernetes client method so the count
    maps to the real create/list/delete call (success vs error), independent
    of the HTTP response status of the surrounding view.
    """
    K8S_OPERATIONS_TOTAL.labels(
        resource=resource,
        operation=operation,
        outcome="success" if ok else "error",
    ).inc()


class PrometheusMiddleware:
    """Measures request count and latency per request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)

        duration = time.perf_counter() - start
        path = request.path
        method = request.method.lower()

        # Ignore self-scraping to avoid counting the metrics endpoint
        if path != "/metrics":
            REQUESTS_TOTAL.labels(
                method=method,
                status=response.status_code,
                path=path,
            ).inc()
            REQUEST_LATENCY.labels(method=method, path=path).observe(duration)

        return response


def metrics_view(request):
    """Render all metrics in the Prometheus text exposition format."""
    from .models import Cluster, Namespace, App, Backup

    CLUSTERS_TOTAL.set(Cluster.objects.count())
    NAMESPACES_TOTAL.set(Namespace.objects.count())
    APPS_TOTAL.set(App.objects.count())
    BACKUPS_TOTAL.set(Backup.objects.count())

    for status_value in ("pending", "running", "completed", "failed"):
        BACKUPS_BY_STATUS.labels(status=status_value).set(
            Backup.objects.filter(status=status_value).count()
        )

    # Backup job terminal outcomes (counter-style gauge computed from DB)
    finished_backups = Backup.objects.filter(
        status__in=["completed", "failed"]
    )
    BACKUP_JOBS_TOTAL.labels(outcome="completed").set(
        finished_backups.filter(status="completed").count()
    )
    BACKUP_JOBS_TOTAL.labels(outcome="failed").set(
        finished_backups.filter(status="failed").count()
    )

    # Backup durations: computed from updated_at - created_at for finished jobs.
    # Reset histogram first so values are rebuilt from the current DB snapshot
    # on every scrape (the standard Histogram accumulates across scrapes).
    reset_histogram(BACKUP_DURATION_SECONDS)
    for backup in finished_backups:
        duration = (backup.updated_at - backup.created_at).total_seconds()
        if duration >= 0:
            BACKUP_DURATION_SECONDS.observe(duration)

    # Backups currently running
    BACKUPS_IN_PROGRESS.set(
        Backup.objects.filter(status="running").count()
    )

    data = generate_latest()
    return HttpResponse(data, content_type=CONTENT_TYPE_LATEST)
