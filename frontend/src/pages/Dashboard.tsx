import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Spin, 
  Button, 
  List, 
  Avatar, 
  Progress, 
  Tag, 
  Space,
  Alert,
  Divider,
  Timeline,
  Empty
} from 'antd';
import {
  ShoppingCartOutlined,
  InboxOutlined,
  DollarOutlined,
  FileTextOutlined,
  RiseOutlined,
  WarningOutlined,
  UserOutlined,
  CalendarOutlined,
  RightOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { handleApiError } from '../utils/errorHandler';

const { Title } = Typography;

interface DashboardStats {
  receipts: {
    total: number;
    today: number;
    thisWeek: number;
    totalValue: number;
  };
  inventory: {
    totalItems: number;
    totalStock: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
  users: {
    total: number;
    activeToday: number;
  };
}

interface RecentActivity {
  id: number;
  type: 'receipt' | 'inventory' | 'user';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchRecentActivities()
      ]);
    } catch (error) {
      handleApiError(error as any, '获取仪表板数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [receiptsRes, inventoryRes, receiptsStatsRes] = await Promise.all([
        axios.get('/api/receipts/list', { params: { limit: 1000 } }),
        axios.get('/api/inventory/stats'),
        axios.get('/api/receipts/stats')
      ]);

      const receiptsData = receiptsRes.data.receipts || [];
      const today = new Date().toDateString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const todayReceipts = receiptsData.filter((r: any) => 
        new Date(r.created_at).toDateString() === today
      ).length;

      const weekReceipts = receiptsData.filter((r: any) => 
        new Date(r.created_at) >= weekAgo
      ).length;

      setStats({
        receipts: {
          total: receiptsData.length,
          today: todayReceipts,
          thisWeek: weekReceipts,
          totalValue: receiptsStatsRes.data?.summary?.total_value || 0
        },
        inventory: {
          totalItems: inventoryRes.data.total_items || 0,
          totalStock: inventoryRes.data.total_stock || 0,
          totalValue: inventoryRes.data.total_value || 0,
          lowStockItems: inventoryRes.data.low_stock_items || 0,
          outOfStockItems: inventoryRes.data.out_of_stock_items || 0
        },
        users: {
          total: 0, // 这里可以添加用户统计API
          activeToday: 1
        }
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  const fetchRecentActivities = async () => {
    setActivitiesLoading(true);
    try {
      // 获取最近的操作日志
      if (isAdmin()) {
        const logsRes = await axios.get('/api/system/logs', { params: { limit: 10 } });
        const logs = logsRes.data.logs || [];
        
        const activities: RecentActivity[] = logs.map((log: any) => ({
          id: log.id,
          type: getActivityType(log.resource),
          title: `${log.action}${log.resource}`,
          description: `用户 ${log.username} 执行了${log.action}操作`,
          timestamp: log.created_at,
          user: log.username
        }));
        
        setRecentActivities(activities);
      } else {
        // 普通用户只显示自己的活动
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('获取活动记录失败:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const getActivityType = (resource: string): 'receipt' | 'inventory' | 'user' => {
    if (resource.includes('收据') || resource.includes('OCR')) return 'receipt';
    if (resource.includes('库存')) return 'inventory';
    return 'user';
  };

  const quickActions: QuickAction[] = [
    {
      key: 'receipt-ocr',
      title: '识别收据',
      description: '上传收据图片进行OCR识别',
      icon: <FileTextOutlined />,
      path: '/receipt-ocr',
      color: '#1890ff'
    },
    {
      key: 'inventory',
      title: '查看库存',
      description: '管理商品库存信息',
      icon: <InboxOutlined />,
      path: '/inventory',
      color: '#52c41a'
    },
    {
      key: 'history',
      title: '历史记录',
      description: '查看采购历史和统计',
      icon: <CalendarOutlined />,
      path: '/history',
      color: '#722ed1'
    }
  ];

  if (isAdmin()) {
    quickActions.push({
      key: 'users',
      title: '用户管理',
      description: '管理系统用户和权限',
      icon: <UserOutlined />,
      path: '/users',
      color: '#fa8c16'
    });
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 欢迎区域 */}
      <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
        <Row align="middle">
          <Col flex="auto">
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              {getGreeting()}，{user?.username}！
            </Title>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0 0', fontSize: '16px' }}>
              欢迎回到代购管理系统
            </p>
          </Col>
          <Col>
            <Button 
              type="primary" 
              size="large" 
              icon={<ReloadOutlined />}
              onClick={fetchDashboardData}
              loading={loading}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none' }}
            >
              刷新数据
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总收据数"
              value={stats?.receipts.total || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  今日 +{stats?.receipts.today || 0}
                </Tag>
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="库存种类"
              value={stats?.inventory.totalItems || 0}
              prefix={<InboxOutlined style={{ color: '#52c41a' }} />}
              suffix={
                stats?.inventory.lowStockItems ? (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    {stats.inventory.lowStockItems} 低库存
                  </Tag>
                ) : null
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总库存数量"
              value={stats?.inventory.totalStock || 0}
              prefix={<ShoppingCartOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="库存总价值"
              value={stats?.inventory.totalValue || 0}
              prefix={<DollarOutlined style={{ color: '#fa541c' }} />}
              precision={2}
              suffix="¥"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 快速操作 */}
        <Col xs={24} lg={12}>
          <Card 
            title="快速操作" 
            extra={<PlusOutlined />}
            style={{ height: '400px' }}
          >
            <Row gutter={[16, 16]}>
              {quickActions.map(action => (
                <Col xs={24} sm={12} key={action.key}>
                  <Card
                    hoverable
                    size="small"
                    onClick={() => navigate(action.path)}
                    style={{ 
                      borderLeft: `4px solid ${action.color}`,
                      cursor: 'pointer'
                    }}
                  >
                    <Space>
                      <Avatar 
                        icon={action.icon} 
                        style={{ backgroundColor: action.color }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{action.title}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {action.description}
                        </div>
                      </div>
                      <RightOutlined style={{ color: '#ccc' }} />
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* 系统状态 */}
        <Col xs={24} lg={12}>
          <Card 
            title="系统状态" 
            extra={<EyeOutlined />}
            style={{ height: '400px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 库存警告 */}
              {stats?.inventory.lowStockItems ? (
                <Alert
                  message="库存警告"
                  description={`有 ${stats.inventory.lowStockItems} 项商品库存不足，${stats.inventory.outOfStockItems} 项已缺货`}
                  type="warning"
                  icon={<WarningOutlined />}
                  showIcon
                  action={
                    <Button size="small" onClick={() => navigate('/inventory')}>
                      查看详情
                    </Button>
                  }
                />
              ) : (
                <Alert
                  message="库存状态良好"
                  description="所有商品库存充足"
                  type="success"
                  showIcon
                />
              )}

              {/* 今日概览 */}
              <div>
                <Title level={5}>今日概览</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="新增收据"
                      value={stats?.receipts.today || 0}
                      prefix={<RiseOutlined />}
                      valueStyle={{ fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="本周收据"
                      value={stats?.receipts.thisWeek || 0}
                      prefix={<CalendarOutlined />}
                      valueStyle={{ fontSize: '20px' }}
                    />
                  </Col>
                </Row>
              </div>

              {/* 系统使用率 */}
              <div>
                <Title level={5}>系统使用情况</Title>
                <div style={{ marginBottom: 8 }}>
                  <span>数据完整性</span>
                  <Progress 
                    percent={95} 
                    size="small" 
                    strokeColor="#52c41a"
                    style={{ marginLeft: 16 }}
                  />
                </div>
                <div>
                  <span>存储使用率</span>
                  <Progress 
                    percent={68} 
                    size="small" 
                    strokeColor="#1890ff"
                    style={{ marginLeft: 16 }}
                  />
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 最近活动 */}
      {isAdmin() && (
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card 
              title="最近活动" 
              extra={
                <Button 
                  type="link" 
                  onClick={() => navigate('/system')}
                >
                  查看更多
                </Button>
              }
            >
              {activitiesLoading ? (
                <Spin />
              ) : recentActivities.length > 0 ? (
                <Timeline>
                  {recentActivities.slice(0, 5).map(activity => (
                    <Timeline.Item key={activity.id}>
                      <div>
                        <strong>{activity.title}</strong>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {activity.description} • {new Date(activity.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Empty description="暂无活动记录" />
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;