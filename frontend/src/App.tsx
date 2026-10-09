import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { StateBlock } from './components/ui';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import CommandCenter from './pages/CommandCenter';
import ShipmentsList from './pages/ShipmentsList';
import ShipmentDetail from './pages/ShipmentDetail';
import ExceptionCenter from './pages/ExceptionCenter';
import DocumentCenter from './pages/DocumentCenter';
import IntelligencePage from './pages/IntelligencePage';
import NetworkIntelligence from './pages/NetworkIntelligence';
import CreateShipment from './pages/CreateShipment';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', background: 'var(--nx-bg)' }}>
        <StateBlock title="Establishing session" spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', background: 'var(--nx-bg)' }}>
        <StateBlock title="Establishing session" spinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>{isAdmin ? <AdminDashboard /> : <CompanyDashboard />}</ProtectedRoute>
      } />

      <Route path="/command-center" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
      <Route path="/shipments" element={<ProtectedRoute><ShipmentsList /></ProtectedRoute>} />
      <Route path="/shipments/new" element={<ProtectedRoute><CreateShipment /></ProtectedRoute>} />
      <Route path="/shipments/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
      <Route path="/exceptions" element={<ProtectedRoute><ExceptionCenter /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentCenter /></ProtectedRoute>} />
      <Route path="/intelligence" element={<ProtectedRoute><IntelligencePage /></ProtectedRoute>} />
      <Route path="/network" element={<ProtectedRoute><NetworkIntelligence /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
