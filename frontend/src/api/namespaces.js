import { get, post, del } from "./client";

export function getNamespaces(clusterId) {
  return get(`/api/namespaces/?cluster_id=${encodeURIComponent(clusterId)}`);
}

export function createNamespace(clusterId, name) {
  return post("/api/namespaces/", { cluster_id: clusterId, name });
}

export function deleteNamespace(namespaceId) {
  return del(`/api/namespaces/${namespaceId}/`);
}
