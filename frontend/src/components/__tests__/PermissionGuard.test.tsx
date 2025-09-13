import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PermissionGuard from '../PermissionGuard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock axios
jest.mock('axios');

// Mock useAuth hook
const mockUseAuth = {
  user: null,
  token: null,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  isAdmin: jest.fn(),
  isAuthenticated: jest.fn()
};

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockUseAuth
}));

describe('PermissionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when user is authenticated and no admin required', () => {
    mockUseAuth.user = { id: 1, username: 'testuser', role: 'user' };
    mockUseAuth.isAdmin.mockReturnValue(false);

    render(
      <PermissionGuard requireAdmin={false}>
        <div>Protected content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('should render children when user is admin and admin required', () => {
    mockUseAuth.user = { id: 1, username: 'admin', role: 'admin' };
    mockUseAuth.isAdmin.mockReturnValue(true);

    render(
      <PermissionGuard requireAdmin={true}>
        <div>Admin content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('should render fallback when user is not admin but admin required', () => {
    mockUseAuth.user = { id: 1, username: 'testuser', role: 'user' };
    mockUseAuth.isAdmin.mockReturnValue(false);

    render(
      <PermissionGuard requireAdmin={true} fallback={<div>Access denied</div>}>
        <div>Admin content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('should render fallback when user is not authenticated', () => {
    mockUseAuth.user = null;

    render(
      <PermissionGuard requireAuth={true} fallback={<div>Please login</div>}>
        <div>Protected content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Please login')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('should render children when requireAuth is false and user not authenticated', () => {
    mockUseAuth.user = null;

    render(
      <PermissionGuard requireAuth={false}>
        <div>Public content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Public content')).toBeInTheDocument();
  });
});