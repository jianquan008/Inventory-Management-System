import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  // 如果没有登录，重定向到登录页
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 如果需要管理员权限但用户不是管理员
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;