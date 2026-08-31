import { get, post, patch } from "./client";

export function getClusters() {
  return get("/api/clusters/");
}

export function createCluster(payload) {
  return post("/api/clusters/", payload);
}

export function updateCluster(clusterId, payload) {
  return patch(`/api/clusters/${clusterId}/`, payload);
}
