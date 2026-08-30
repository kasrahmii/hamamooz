import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { Layout } from "antd";
import ClustersPage from "./pages/ClustersPage";
import NamespacesPage from "./pages/NamespacesPage";
import AppsPage from "./pages/AppsPage";
import AppDetailPage from "./pages/AppDetailPage";

const { Header, Content, Footer } = Layout;

export default function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: "100vh" }}>
        <Header style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/clusters" style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>
            KuberDashboard
          </Link>
          <Link to="/clusters" style={{ color: "#ffffffcc" }}>
            Clusters
          </Link>
        </Header>
        <Content>
          <Routes>
            <Route path="/" element={<Navigate to="/clusters" replace />} />
            <Route path="/clusters" element={<ClustersPage />} />
            <Route
              path="/clusters/:clusterId"
              element={<Navigate to="./namespaces" replace />}
            />
            <Route
              path="/clusters/:clusterId/namespaces"
              element={<NamespacesPage />}
            />
            <Route
              path="/clusters/:clusterId/namespaces/:namespaceId/apps"
              element={<AppsPage />}
            />
            <Route
              path="/clusters/:clusterId/namespaces/:namespaceId/apps/:appId"
              element={<AppDetailPage />}
            />
            <Route path="*" element={<Navigate to="/clusters" replace />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: "center" }}>Kubernetes Manager</Footer>
      </Layout>
    </BrowserRouter>
  );
}
