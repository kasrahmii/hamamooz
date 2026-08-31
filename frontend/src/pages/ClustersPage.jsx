import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Tag,
  Flex,
  Space,
  Modal,
  Form,
  Input,
  Tooltip,
  Alert,
} from "antd";
import { PlusOutlined, KeyOutlined } from "@ant-design/icons";
import { getClusters, createCluster, updateCluster } from "../api/clusters";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

export default function ClustersPage() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createForm] = Form.useForm();

  const [tokenTarget, setTokenTarget] = useState(null);
  const [updatingToken, setUpdatingToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [tokenForm] = Form.useForm();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getClusters();
        if (mounted) setClusters(data);
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
  }, []);

  const refetch = async () => {
    const data = await getClusters();
    setClusters(data);
  };

  const handleCreate = async (values) => {
    setCreating(true);
    setCreateError(null);
    try {
      await createCluster({
        name: values.name,
        address: values.address,
        token: values.token,
      });
      setCreateOpen(false);
      createForm.resetFields();
      await refetch();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateToken = async (values) => {
    setUpdatingToken(true);
    setTokenError(null);
    try {
      await updateCluster(tokenTarget.id, { token: values.token });
      setTokenTarget(null);
      tokenForm.resetFields();
      await refetch();
    } catch (e) {
      setTokenError(e.message);
    } finally {
      setUpdatingToken(false);
    }
  };

  if (loading) return <LoadingState text="Loading clusters..." />;
  if (error)
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Clusters</h1>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Add Cluster
          </Button>
        </Space>
      </div>

      {clusters.length === 0 ? (
        <EmptyState
          description="No clusters found."
          action={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Add Cluster
            </Button>
          }
        />
      ) : (
        <Flex wrap gap={[24, 16]}>
          {clusters.map((cluster) => (
            <Card key={cluster.id} style={{ width: 320, minHeight: 200 }}>
              <Card.Meta title={cluster.name} description={cluster.address} />
              <div style={{ marginTop: 12 }}>
                <Tag color="blue">Cluster</Tag>
              </div>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Button
                  type="primary"
                  onClick={() =>
                    navigate(`/clusters/${cluster.id}/namespaces`)
                  }
                >
                  View Namespaces
                </Button>
                <Tooltip title="Update authentication token">
                  <Button
                    icon={<KeyOutlined />}
                    onClick={() => {
                      setTokenError(null);
                      tokenForm.resetFields();
                      setTokenTarget(cluster);
                    }}
                  >
                    Update Token
                  </Button>
                </Tooltip>
              </div>
            </Card>
          ))}
        </Flex>
      )}

      <Modal
        open={createOpen}
        title="Add Cluster"
        okText="Add"
        cancelText="Cancel"
        onCancel={() => {
          setCreateOpen(false);
          setCreateError(null);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        width={520}
      >
        {createError && (
          <Alert
            type="error"
            showIcon
            message="Error"
            description={createError}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter a cluster name" }]}
          >
            <Input placeholder="my-cluster" />
          </Form.Item>

          <Form.Item
            label="Address"
            name="address"
            rules={[{ required: true, message: "Please enter the cluster address" }]}
            extra="Kubernetes API server address (e.g. https://192.168.1.10:6443)"
          >
            <Input placeholder="https://192.168.1.10:6443" />
          </Form.Item>

          <Form.Item
            label="Token"
            name="token"
            rules={[{ required: true, message: "Please enter the cluster token" }]}
          >
            <Input.Password placeholder="Kubernetes service account token" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!tokenTarget}
        title={`Update Token: ${tokenTarget?.name || ""}`}
        okText="Save"
        cancelText="Cancel"
        onCancel={() => {
          setTokenTarget(null);
          setTokenError(null);
          tokenForm.resetFields();
        }}
        onOk={() => tokenForm.submit()}
        confirmLoading={updatingToken}
      >
        {tokenError && (
          <Alert
            type="error"
            showIcon
            message="Error"
            description={tokenError}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={tokenForm} layout="vertical" onFinish={handleUpdateToken}>
          <Form.Item
            label="New Token"
            name="token"
            rules={[{ required: true, message: "Please enter the new token" }]}
          >
            <Input.Password placeholder="Kubernetes service account token" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
