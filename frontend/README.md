# Hamamooz Frontend (Kubernetes Manager)

React + Vite + Ant Design dashboard for managing the Hamamooz Kubernetes
cluster, following the hierarchy **Cluster → Namespace → App**.

## Tech stack

- React 19
- Vite 8
- React Router (BrowserRouter)
- Ant Design (UI)
- Plain `fetch` for the API (no Redux/React Query)

## Local development

```bash
npm install
cp .env.example .env.local   # optional; defaults to http://127.0.0.1:8000
npm run dev
```

Open http://localhost:5173.

### API base URL

The API base URL comes from `VITE_API_BASE_URL` and is read in
`src/config.js`. If unset it defaults to `http://127.0.0.1:8000`.

- Local: `VITE_API_BASE_URL=http://127.0.0.1:8000`
- Production: `VITE_API_BASE_URL=http://api.ahmadi.osdl.ir`

The value is baked in at **build time**, so rebuild after changing it.

## Project layout

```
src/
  config.js        # API_BASE_URL from environment
  App.jsx          # router + layout
  main.jsx
  api/
    client.js      # fetch wrapper
    clusters.js
    namespaces.js
    apps.js
  components/
    LoadingState.jsx
    ErrorState.jsx
    EmptyState.jsx
    ConfirmDialog.jsx
    AppStatusBadge.jsx
    PodTable.jsx
    AppForm.jsx
  pages/
    ClustersPage.jsx      # /clusters
    NamespacesPage.jsx    # /clusters/:clusterId/namespaces
    AppsPage.jsx          # /clusters/:clusterId/namespaces/:nsId/apps
    AppDetailPage.jsx     # .../apps/:appId
```

## Routes

```
/clusters
/clusters/:clusterId/namespaces
/clusters/:clusterId/namespaces/:namespaceId/apps
/clusters/:clusterId/namespaces/:namespaceId/apps/:appId
```

The nginx config uses `try_files $uri $uri/ /index.html;` so any route can be
bookmarked/reloaded directly.

## Production build

```bash
npm run build          # outputs to dist/
```

### Docker image (linux/amd64)

```bash
docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_BASE_URL=http://api.ahmadi.osdl.ir \
  -t <dockerhub-user>/hamamooz-frontend:v1 \
  --push \
  .
```

The `Dockerfile` is a two-stage build: Node builds the frontend, then the
static assets are served by `nginx:alpine` with the provided `nginx.conf`.

## Kubernetes deployment

Manifests live in `frontend/k8s/`:

- `frontend-deployment.yaml` — Deployment (served from `ahmadi.osdl.ir`)
- `frontend-service.yaml` — ClusterIP Service
- `frontend-ingress.yaml` — Traefik Ingress for `ahmadi.osdl.ir`

## Backend CORS

The backend must allow the frontend origin. See the backend project for the
`django-cors-headers` setup and the `CORS_ALLOWED_ORIGINS` ConfigMap value
(which includes `http://ahmadi.osdl.ir` and the local dev origins).
