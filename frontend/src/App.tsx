import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import CommandCenter from './pages/CommandCenter';
import ShipmentDetail from './pages/ShipmentDetail';
import ExceptionCenter from './pages/ExceptionCenter';
import NetworkIntelligence from './pages/NetworkIntelligence';
import CreateShipment from './pages/CreateShipment';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          {isAdmin ? <AdminDashboard /> : <CompanyDashboard />}
        </ProtectedRoute>
      } />
      <Route path="/command-center" element={
        <ProtectedRoute><CommandCenter /></ProtectedRoute>
      } />
      <Route path="/shipments/new" element={
        <ProtectedRoute><CreateShipment /></ProtectedRoute>
      } />
      <Route path="/shipments/:id" element={
        <ProtectedRoute><ShipmentDetail /></ProtectedRoute>
      } />
      <Route path="/exceptions" element={
        <ProtectedRoute><ExceptionCenter /></ProtectedRoute>
      } />
      <Route path="/network" element={
        <ProtectedRoute><NetworkIntelligence /></ProtectedRoute>
      } />
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
