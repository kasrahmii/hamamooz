import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Breadcrumb,
  Card,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
  Tooltip,
  Flex,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { getClusters } from "../api/clusters";
import { getNamespaces } from "../api/namespaces";
import {
  getApps,
  createApp,
  deleteApp,
} from "../api/apps";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import AppStatusBadge from "../components/AppStatusBadge";

export default function AppsPage() {
  const { clusterId, namespaceId } = useParams();
  const navigate = useNavigate();

  const [cluster, setCluster] = useState(null);
  const [namespace, setNamespace] = useState(null);
  const [apps, setApps] = useState([]);
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
        const [clusterData, nsData, appsData] = await Promise.all([
          getClusters(),
          getNamespaces(clusterId),
          getApps(namespaceId),
        ]);
        const c = clusterData.find((c) => String(c.id) === String(clusterId));
        const ns = nsData.find((n) => String(n.id) === String(namespaceId));
        if (mounted) {
          setCluster(c || null);
          setNamespace(ns || null);
          setApps(appsData);
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
  }, [clusterId, namespaceId]);

  const refetchApps = async () => {
    const data = await getApps(namespaceId);
    setApps(data);
  };

  const handleCreate = async (values) => {
    setCreating(true);
    setCreateError(null);
    try {
      await createApp({
        namespace_id: Number(namespaceId),
        name: values.name,
        image: values.image,
        replicas: Number(values.replicas) || 1,
        cpu: values.cpu || "100m",
        memory: values.memory || "128Mi",
      });
      setCreateOpen(false);
      createForm.resetFields();
      await refetchApps();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteApp(deleteTarget.id);
      await refetchApps();
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState text="Loading apps..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Breadcrumb
        items={[
          { title: <Link to="/clusters">Clusters</Link> },
          { title: <Link to={`/clusters/${clusterId}/namespaces`}>{cluster?.name || `Cluster ${clusterId}`}</Link> },
          { title: namespace?.name || `Namespace ${namespaceId}` },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>
          Apps{namespace ? ` (${namespace.name})` : ""}
        </h1>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          <PlusOutlined /> Create App
        </Button>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          description="No apps found in this namespace."
          action={
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              <PlusOutlined /> Create App
            </Button>
          }
        />
      ) : (
        <Flex wrap gap={[24, 16]}>
          {apps.map((app) => (
            <Card key={app.id} style={{ width: 360, minHeight: 220 }}>
              <Card.Meta title={app.name} description={`Namespace: ${app.namespace}`} />
              <div style={{ marginTop: 12 }}>
                <Space wrap>
                  <AppStatusBadge app={app} />
                  <Tag>{app.replicas} replicas</Tag>
                </Space>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
                {app.pods && app.pods.length > 0 ? (
                  <>
                    {app.pods.filter((p) => p.ready).length} / {app.replicas} pods ready
                  </>
                ) : (
                  "No pods yet"
                )}
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                  type="primary"
                  onClick={() =>
                    navigate(
                      `/clusters/${clusterId}/namespaces/${namespaceId}/apps/${app.id}`
                    )
                  }
                >
                  Details
                </Button>
                <Tooltip title="Delete app">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setDeleteTarget(app)}
                  />
                </Tooltip>
              </div>
            </Card>
          ))}
        </Flex>
      )}

      <Modal
        open={createOpen}
        title="Create App"
        okText="Create"
        cancelText="Cancel"
        onCancel={() => {
          setCreateOpen(false);
          setCreateError(null);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        width={600}
      >
        {createError && (
          <div style={{ color: "#ff4d4f", marginBottom: 16 }}>{createError}</div>
        )}
        <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            preserve
            initialValues={{
              replicas: 1,
              cpu: "100m",
              memory: "128Mi",
            }}
          >
          <Form.Item
            label="App Name"
            name="name"
            rules={[{ required: true, message: "Please enter an app name" }]}
          >
            <Input placeholder="my-app" />
          </Form.Item>

          <Form.Item
            label="Image"
            name="image"
            rules={[{ required: true, message: "Please enter a container image" }]}
          >
            <Input placeholder="nginx:latest" />
          </Form.Item>

          <Form.Item
            label="Replicas"
            name="replicas"
            rules={[{ required: true, min: 1 }]}
            initialValue={1}
            preserve
          >
            <InputNumber min={1} defaultValue={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="CPU" name="cpu" initialValue="100m" preserve>
            <Input defaultValue="100m" placeholder="100m" />
          </Form.Item>

          <Form.Item label="Memory" name="memory" initialValue="128Mi" preserve>
            <Input defaultValue="128Mi" placeholder="128Mi" />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete App"
        description={
          deleteTarget
            ? `Are you sure you want to delete app "${deleteTarget.name}"? This will also delete its Kubernetes deployment and pods. This cannot be undone.`
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