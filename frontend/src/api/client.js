import { API_BASE_URL } from "../config";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  const res = await fetch(url, config);

  if (res.status === 204) {
    return null;
  }

  const data = await res.json();

  if (!res.ok) {
    const message =
      data?.error ||
      data?.detail ||
      Object.entries(data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("; ") ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export function get(path) {
  return request(path);
}

export function post(path, body) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patch(path, body) {
  return request(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function del(path) {
  return request(path, {
    method: "DELETE",
  });
}
