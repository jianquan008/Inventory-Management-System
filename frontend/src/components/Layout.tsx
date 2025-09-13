import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  FloatButton,
  message
} from 'antd';
import {
  DashboardOutlined,
  ScanOutlined,
  InboxOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  ControlOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import NetworkStatus from './NetworkStatus';
import HelpModal from './HelpModal';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 快捷键支持
  useKeyboardShortcuts([
    {
      ...commonShortcuts.help,
      callback: () => setHelpVisible(true)
    },
    {
      ...commonShortcuts.refresh,
      callback: () => {
        window.location.reload();
      }
    },
    {
      key: '1',
      altKey: true,
      callback: () => navigate('/dashboard'),
      description: 'Alt+1 仪表板'
    },
    {
      key: '2',
      altKey: true,
      callback: () => navigate('/receipt-ocr'),
      description: 'Alt+2 收据识别'
    },
    {
      key: '3',
      altKey: true,
      callback: () => navigate('/inventory'),
      description: 'Alt+3 库存管理'
    },
    {
      key: '4',
      altKey: true,
      callback: () => navigate('/history'),
      description: 'Alt+4 历史单据'
    }
  ]);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/receipt-ocr',
      icon: <ScanOutlined />,
      label: '收据识别',
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: '库存管理',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '历史单据',
    },
  ];

  if (isAdmin()) {
    menuItems.push(
      {
        key: '/users',
        icon: <UserOutlined />,
        label: '用户管理',
      },
      {
        key: '/system',
        icon: <SettingOutlined />,
        label: '系统管理',
      }
    );
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: '帮助中心',
      onClick: () => setHelpVisible(true),
    },
    {
      key: 'shortcuts',
      icon: <ControlOutlined />,
      label: '快捷键',
      onClick: () => {
        message.info('按 Ctrl+H 查看完整帮助信息');
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <NetworkStatus />
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo">
          {collapsed ? '代购' : '代购管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 16px', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <Space>
            <span>欢迎，{user?.username}</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* 浮动按钮 */}
      <FloatButton.Group
        trigger="hover"
        type="primary"
        style={{ right: 24 }}
        icon={<QuestionCircleOutlined />}
      >
        <FloatButton
          icon={<QuestionCircleOutlined />}
          tooltip="帮助中心 (Ctrl+H)"
          onClick={() => setHelpVisible(true)}
        />
        <FloatButton
          icon={<ControlOutlined />}
          tooltip="快捷键"
          onClick={() => message.info('按 Ctrl+H 查看完整快捷键列表')}
        />
      </FloatButton.Group>

      {/* 帮助模态框 */}
      <HelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />
    </Layout>
  );
};

export default AppLayout;