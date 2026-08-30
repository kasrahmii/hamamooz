import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Breadcrumb,
  Card,
  Button,
  Space,
  Flex,
  Alert,
  Divider,
  Modal,
} from "antd";
import { DeleteOutlined, EditOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { getClusters } from "../api/clusters";
import { getNamespaces } from "../api/namespaces";
import { getApp, updateApp, deleteApp } from "../api/apps";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import ConfirmDialog from "../components/ConfirmDialog";
import AppForm from "../components/AppForm";
import PodTable from "../components/PodTable";
import AppStatusBadge from "../components/AppStatusBadge";

export default function AppDetailPage() {
  const { clusterId, namespaceId, appId } = useParams();
  const navigate = useNavigate();

  const [cluster, setCluster] = useState(null);
  const [namespace, setNamespace] = useState(null);
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const formRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [clusterData, nsData, appData] = await Promise.all([
          getClusters(),
          getNamespaces(clusterId),
          getApp(namespaceId, appId),
        ]);
        const c = clusterData.find((c) => String(c.id) === String(clusterId));
        const ns = nsData.find((n) => String(n.id) === String(namespaceId));
        if (mounted) {
          setCluster(c || null);
          setNamespace(ns || null);
          setApp(appData);
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
  }, [clusterId, namespaceId, appId]);

  const refetchApp = async () => {
    const data = await getApp(namespaceId, appId);
    setApp(data);
  };

  const handleEdit = async (values) => {
    setEditing(true);
    setEditError(null);
    try {
      await updateApp(appId, values);
      setEditOpen(false);
      await refetchApp();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteApp(appId);
      navigate(`/clusters/${clusterId}/namespaces/${namespaceId}/apps`);
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState text="Loading app details..." />;
  if (error) return <ErrorState message={error} onRetry={refetchApp} />;
  if (!app) return <LoadingState text="Loading app details..." />;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
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
          {
            title: (
              <Link to={`/clusters/${clusterId}/namespaces/${namespaceId}/apps`}>
                {namespace?.name || `Namespace ${namespaceId}`}
              </Link>
            ),
          },
          { title: app.name },
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
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/clusters/${clusterId}/namespaces/${namespaceId}/apps`)} />
          <h1 style={{ margin: 0 }}>{app.name}</h1>
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setEditError(null);
              setEditOpen(true);
            }}
          >
            Edit
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </Space>
      </div>

      <Flex wrap gap={[24, 16]} style={{ marginBottom: 24 }}>
        <Card style={{ flex: 1, minWidth: 320 }} title="App Information">
          <p>
            <strong>Namespace: </strong>
            {app.namespace}
          </p>
          <p>
            <strong>Image: </strong>
            <code>{app.image}</code>
          </p>
          <p>
            <strong>Replicas: </strong>
            {app.replicas}
          </p>
          <p>
            <strong>CPU: </strong>
            <code>{app.cpu}</code>
          </p>
          <p>
            <strong>Memory: </strong>
            <code>{app.memory}</code>
          </p>
        </Card>

        <Card style={{ flex: 1, minWidth: 320 }} title="Live Status">
          <p>
            <strong>Overall: </strong>
            <AppStatusBadge app={app} />
          </p>
          <p>
            <strong>Ready Pods: </strong>
            {app.pods?.filter((p) => p.ready).length || 0} / {app.replicas}
          </p>
        </Card>
      </Flex>

      <Divider orientation="left">Pods</Divider>
      <PodTable pods={app.pods || []} />

      <Modal
        open={editOpen}
        title={`Edit App: ${app.name}`}
        okText="Save"
        cancelText="Cancel"
        onCancel={() => {
          setEditOpen(false);
          setEditError(null);
        }}
        onOk={() => formRef.current?.submit()}
        confirmLoading={editing}
        width={600}
        footer={null}
      >
        {editError && (
          <Alert
            type="error"
            showIcon
            message="Error"
            description={editError}
            style={{ marginBottom: 16 }}
          />
        )}
        <AppForm
          formRef={formRef}
          initialValues={app}
          loading={editing}
          submitLabel="Save"
          onCancel={() => setEditOpen(false)}
          onSubmit={handleEdit}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete App"
        description={`Are you sure you want to delete app "${app.name}"? This will delete its Kubernetes deployment and pods. This cannot be undone.`}
        confirmLoading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}