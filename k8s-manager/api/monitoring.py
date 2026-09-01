"""Prometheus metrics for the hamamooz backend.

Exposes a lightweight /metrics endpoint using prometheus_client, avoiding
the Django version constraints of django-prometheus (which only supports
Django < 6.1).
"""

import time

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

    data = generate_latest()
    return HttpResponse(data, content_type=CONTENT_TYPE_LATEST)
