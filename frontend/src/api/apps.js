import { get, post, patch, del } from "./client";

export function getApps(namespaceId) {
  return get(`/api/apps/?namespace_id=${encodeURIComponent(namespaceId)}`);
}

export function getApp(namespaceId, appId) {
  return getApps(namespaceId).then((apps) => {
    const app = apps.find((a) => String(a.id) === String(appId));
    if (!app) {
      throw new Error("App not found");
    }
    return app;
  });
}

export function createApp(payload) {
  return post("/api/apps/", payload);
}

export function updateApp(appId, payload) {
  return patch(`/api/apps/${appId}/`, payload);
}

export function deleteApp(appId) {
  return del(`/api/apps/${appId}/`);
}
