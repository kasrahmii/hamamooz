import { Tag } from "antd";

export function statusMeta(status) {
  switch (status) {
    case "Running":
      return { color: "green", label: "Running" };
    case "Pending":
      return { color: "gold", label: "Pending" };
    case "Succeeded":
      return { color: "blue", label: "Succeeded" };
    case "Failed":
      return { color: "red", label: "Failed" };
    default:
      return { color: "default", label: status || "Unknown" };
  }
}

export function PodStatusTag({ status }) {
  const { color, label } = statusMeta(status);
  return <Tag color={color}>{label}</Tag>;
}

export function PodReadyTag({ ready }) {
  return ready ? <Tag color="green">Ready</Tag> : <Tag color="red">Not Ready</Tag>;
}

export default function AppStatusBadge({ app }) {
  if (app.ready) {
    return <Tag color="green">Running</Tag>;
  }

  if (!app.pods || app.pods.length === 0) {
    return <Tag color="default">Unknown</Tag>;
  }

  if (app.pods.some((p) => p.status === "Failed")) {
    return <Tag color="red">Failed</Tag>;
  }

  if (app.pods.some((p) => p.status === "Pending")) {
    return <Tag color="gold">Pending</Tag>;
  }

  if (app.pods.some((p) => p.status === "Running" && !p.ready)) {
    return <Tag color="orange">Not Ready</Tag>;
  }

  return <Tag color="blue">Pending</Tag>;
}
