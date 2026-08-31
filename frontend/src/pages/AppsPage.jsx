import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Breadcrumb,
  Card,
  Button,
  Modal,
  Input,
  InputNumber,
  Space,
  Tag,
  Tooltip,
  Flex,
  Form,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { getClusters } from "../api/clusters";
import { getNamespaces } from "../api/namespaces";
import { getApps, createApp, deleteApp } from "../api/apps";
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
  const [appName, setAppName] = useState("");
  const [appImage, setAppImage] = useState("");
  const [appReplicas, setAppReplicas] = useState(1);
  const [appCpu, setAppCpu] = useState("100m");
  const [appMemory, setAppMemory] = useState("128Mi");

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

  const resetCreateForm = () => {
    setAppName("");
    setAppImage("");
    setAppReplicas(1);
    setAppCpu("100m");
    setAppMemory("128Mi");
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!appName.trim() || !appImage.trim()) {
      setCreateError("Name and Image are required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createApp({
        namespace_id: Number(namespaceId),
        name: appName.trim(),
        image: appImage.trim(),
        replicas: Number(appReplicas) || 1,
        cpu: appCpu || "100m",
        memory: appMemory || "128Mi",
      });
      setCreateOpen(false);
      resetCreateForm();
      await refetchApps();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
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
  if (error)
    return (
      <ErrorState message={error} onRetry={() => window.location.reload()} />
    );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Breadcrumb
        items={[
          { title: <Link to="/clusters">Clusters</Link> },
          {
            title: (
              <Link to={`/clusters/${clusterId}/namespaces`}>
                {cluster?.name || `Cluster ${clusterId}`}
              </Link>
            ),
          },
          { title: namespace?.name || `Namespace ${namespaceId}` },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>
          Apps{namespace ? ` (${namespace.name})` : ""}
        </h1>
        <Button
          type="primary"
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
        >
          <PlusOutlined /> Create App
        </Button>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          description="No apps found in this namespace."
          action={
            <Button
              type="primary"
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
            >
              <PlusOutlined /> Create App
            </Button>
          }
        />
      ) : (
        <Flex wrap gap={[24, 16]}>
          {apps.map((app) => (
            <Card key={app.id} style={{ width: 360, minHeight: 220 }}>
              <Card.Meta
                title={app.name}
                description={`Namespace: ${app.namespace}`}
              />
              <div style={{ marginTop: 12 }}>
                <Space wrap>
                  <AppStatusBadge app={app} />
                  <Tag>{app.replicas} replicas</Tag>
                </Space>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
                {app.pods && app.pods.length > 0 ? (
                  <>
                    {app.pods.filter((p) => p.ready).length} / {app.replicas}{" "}
                    pods ready
                  </>
                ) : (
                  "No pods yet"
                )}
              </div>
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
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
          resetCreateForm();
        }}
        onOk={handleCreate}
        confirmLoading={creating}
        width={600}
      >
        {createError && (
          <div style={{ color: "#ff4d4f", marginBottom: 16 }}>
            {createError}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              App Name *
            </label>
            <Input
              placeholder="my-app"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Image *
            </label>
            <Input
              placeholder="nginx:latest"
              value={appImage}
              onChange={(e) => setAppImage(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Replicas
            </label>
            <InputNumber
              min={1}
              value={appReplicas}
              onChange={(v) => setAppReplicas(v)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              CPU
            </label>
            <Input
              placeholder="100m"
              value={appCpu}
              onChange={(e) => setAppCpu(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Memory
            </label>
            <Input
              placeholder="128Mi"
              value={appMemory}
              onChange={(e) => setAppMemory(e.target.value)}
            />
          </div>
        </div>
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
