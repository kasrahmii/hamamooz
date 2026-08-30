import { get } from "./client";

export function getClusters() {
  return get("/api/clusters/");
}
