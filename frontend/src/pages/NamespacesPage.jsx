import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Breadcrumb,
  Card,
  Button,
  Form,
  Input,
  Modal,
  Tag,
  Tooltip,
  Flex,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { getClusters } from "../api/clusters";
import {
  getNamespaces,
  createNamespace,
  deleteNamespace,
} from "../api/namespaces";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

export default function NamespacesPage() {
  const { clusterId } = useParams();
  const navigate = useNavigate();

  const [cluster, setCluster] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createForm] = Form.useForm();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [clusterData, nsData] = await Promise.all([
          getClusters(),
          getNamespaces(clusterId),
        ]);
        const match = clusterData.find((c) => String(c.id) === String(clusterId));
        if (mounted) {
          setCluster(match || null);
          setNamespaces(nsData);
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [clusterId]);

  const refetchNamespaces = async () => {
    const data = await getNamespaces(clusterId);
    setNamespaces(data);
  };

  const handleCreate = async (values) => {
    setCreating(true);
    setCreateError(null);
    try {
      await createNamespace(Number(clusterId), values.name);
      setCreateOpen(false);
      createForm.resetFields();
      await refetchNamespaces();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteNamespace(deleteTarget.id);
      await refetchNamespaces();
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };
  if (loading) return <LoadingState text="Loading namespaces..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <Breadcrumb
        items={[
          { title: <Link to="/clusters">Clusters</Link> },
          { title: cluster?.name || `Cluster ${clusterId}` },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>
          Namespaces{cluster ? ` (${cluster.name})` : ""}
        </h1>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Create Namespace
        </Button>
      </div>

      {namespaces.length === 0 ? (
        <EmptyState
          description="No namespaces found for this cluster."
          action={
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Create Namespace
            </Button>
          }
        />
      ) : (
        <Flex wrap gap={[24, 16]}>
          {namespaces.map((ns) => (
            <Card key={ns.id} style={{ width: 280 }}>
              <Card.Meta title={ns.name} />
              <div style={{ marginTop: 8 }}>
                <Tag>Namespace</Tag>
              </div>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                  type="primary"
                  onClick={() =>
                    navigate(`/clusters/${clusterId}/namespaces/${ns.id}/apps`)
                  }
                >
                  View Apps
                </Button>
                <Tooltip title="Delete namespace">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setDeleteTarget(ns)}
                  />
                </Tooltip>
              </div>
            </Card>
          ))}
        </Flex>
      )}

      <Modal
        open={createOpen}
        title="Create Namespace"
        okText="Create"
        cancelText="Cancel"
        onCancel={() => {
          setCreateOpen(false);
          setCreateError(null);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
      >
        {createError && (
          <div style={{ color: "#ff4d4f", marginBottom: 16 }}>{createError}</div>
        )}
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="Namespace Name"
            name="name"
            rules={[{ required: true, message: "Please enter a namespace name" }]}
          >
            <Input placeholder="my-namespace" />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Namespace"
        description={
          deleteTarget
            ? `Are you sure you want to delete namespace "${deleteTarget.name}"? This will also delete its Kubernetes resources. This cannot be undone.`
            : ""
        }
        confirmLoading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}