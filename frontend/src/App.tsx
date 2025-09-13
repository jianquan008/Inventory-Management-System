import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReceiptOCR from './pages/ReceiptOCR';
import Inventory from './pages/Inventory';
import History from './pages/History';
import UserManagement from './pages/UserManagement';
import SystemManagement from './pages/SystemManagement';

const { Content } = Layout;

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="receipt-ocr" element={<ReceiptOCR />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="history" element={<History />} />
        <Route path="users" element={
          <ProtectedRoute requireAdmin>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="system" element={
          <ProtectedRoute requireAdmin>
            <SystemManagement />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;