import { Card, Button, Tag, Flex, Space } from "antd";
import { getClusters } from "../api/clusters";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

export default function ClustersPage() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <LoadingState text="Loading clusters..." />;
  if (error)
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Clusters</h1>
      </div>

      {clusters.length === 0 ? (
        <EmptyState description="No clusters found." />
      ) : (
        <Flex wrap gap={[24, 16]}>
          {clusters.map((cluster) => (
            <Card key={cluster.id} style={{ width: 300, minHeight: 180 }}>
              <Card.Meta title={cluster.name} description={cluster.address} />
              <div style={{ marginTop: 12 }}>
                <Tag>Cluster</Tag>
              </div>
              <div style={{ marginTop: 24, textAlign: "right" }}>
                <Button
                  type="primary"
                  onClick={() =>
                    navigate(`/clusters/${cluster.id}/namespaces`)
                  }
                >
                  View Namespaces
                </Button>
              </div>
            </Card>
          ))}
        </Flex>
      )}
    </div>
  );
}