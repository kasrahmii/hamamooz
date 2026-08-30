import { Empty } from "antd";

export default function EmptyState({ description, action }) {
  return (
    <div style={{ padding: "60px 0", textAlign: "center" }}>
      <Empty description={description}>{action}</Empty>
    </div>
  );
}
