import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  requireAdmin = false, 
  requireAuth = true,
  fallback = null 
}) => {
  const { user, isAdmin } = useAuth();

  // 如果需要认证但用户未登录
  if (requireAuth && !user) {
    return <>{fallback}</>;
  }

  // 如果需要管理员权限但用户不是管理员
  if (requireAdmin && !isAdmin()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;