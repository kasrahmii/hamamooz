import { Table, Tag, Empty } from "antd";
import { PodStatusTag, PodReadyTag } from "./AppStatusBadge";

export default function PodTable({ pods }) {
  if (!pods || pods.length === 0) {
    return <Empty description="No pods found for this app" />;
  }

  const columns = [
    {
      title: "Pod Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <PodStatusTag status={status} />,
    },
    {
      title: "Ready",
      dataIndex: "ready",
      key: "ready",
      render: (ready) => <PodReadyTag ready={ready} />,
    },
  ];

  return (
    <Table
      dataSource={pods}
      columns={columns}
      rowKey="name"
      size="middle"
      bordered
      pagination={false}
    />
  );
}