# Hamamooz Backend Monitoring

Prometheus + Grafana dashboard for the Django REST backend.

The backend exposes Prometheus metrics at `GET /metrics` (see
`k8s-manager/api/monitoring.py`). Docker Compose wires up Prometheus to scrape
that endpoint and Grafana with a pre-provisioned dashboard.

## What it monitors

- **Request throughput (QPS)** by endpoint
- **API latency** (p50 / p95 histogram)
- **Total request rate**
- **5xx error rate**
- **Requests by HTTP status**
- **Resource counts**: clusters / namespaces / apps / backups
- **Backups by status** (pending / running / completed / failed)

Metrics exposed by the backend (namespace `hamamooz_`):

| Metric | Type | Description |
|--------|------|-------------|
| `hamamooz_http_requests_total{method,status,path}` | Counter | Request count |
| `hamamooz_http_request_duration_seconds_bucket{method,path}` | Histogram | Latency |
| `hamamooz_clusters_total` | Gauge | Registered clusters |
| `hamamooz_namespaces_total` | Gauge | Namespaces |
| `hamamooz_apps_total` | Gauge | Apps / deployments |
| `hamamooz_backups_total` | Gauge | Backup records |
| `hamamooz_backups_by_status{status}` | Gauge | Backups by status |

`prometheus_client` also emits `python_*` process metrics.

## Prerequisites

- Docker (with Docker Desktop running on macOS)
- The backend running and reachable on **port 8000** on the host

Because the backend runs on the host, Prometheus (in a container) reaches it at
`host.docker.internal:8000` (this works on Docker Desktop for macOS/Windows).
If you run everything on Linux containers, change
`monitoring/prometheus/prometheus.yml` to use `127.0.0.1:8000` (or set up the
backend as a Docker service and reference it by name).

## Bring it up

```bash
# 1. Start the backend (from k8s-manager/), including Redis
cd ../k8s-manager
redis-server &
venv/bin/python manage.py runserver 0.0.0.0:8000

# 2. In another terminal, start Prometheus + Grafana
cd ../monitoring
docker compose up -d
```

## Access

- **Grafana**: http://localhost:3000  (admin / admin)
  - Log in → "Dashboards" → "Hamamooz" → **Hamamooz Backend Monitoring**
  - The dashboard is auto-provisioned.
- **Prometheus**: http://localhost:9090
  - Targets → verify `hamamooz-backend` is UP.

## Tear down

```bash
docker compose down          # stop containers
docker compose down -v       # also delete data volumes
```

## Customizing

- Scrape interval / targets: `prometheus/prometheus.yml`
- Dashboard panels: edit in Grafana UI (auto-saved back via provisioning),
  or edit `grafana/dashboards/hamamooz-backend.json`.
- Grafana defaults (admin/admin) are in `docker-compose.yml`; change them
  before exposing Grafana beyond localhost.
