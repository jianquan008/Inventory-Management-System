import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Modal,
  Typography,
  Space,
  Alert,
  Progress,
  Tag,
  Descriptions,
  message,
  Popconfirm,
  Tabs
} from 'antd';
import {
  DatabaseOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import axios from 'axios';
import { handleApiError, showSuccessMessage } from '../utils/errorHandler';

const { Title, Text } = Typography;

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  errors: string[];
}

interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  nodeVersion: string;
  cpuCount: number;
  totalMemory: number;
  uptime: number;
}

interface BackupFile {
  name: string;
  path: string;
  size: number;
  created: string;
}

interface OperationLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  resource: string;
  details: string;
  ip_address: string;
  created_at: string;
}

const SystemManagement: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [healthHistory, setHealthHistory] = useState<SystemHealth[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchSystemHealth();
    fetchSystemInfo();
    fetchBackups();
    fetchLogs();
    fetchHealthHistory();
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const response = await axios.get('/api/system/health');
      setHealth(response.data);
    } catch (error: any) {
      handleApiError(error as any, '获取系统健康状态失败');
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system/info');
      setSystemInfo(response.data);
    } catch (error: any) {
      handleApiError(error as any, '获取系统信息失败');
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/system/backups');
      setBackups(response.data);
    } catch (error: any) {
      handleApiError(error as any, '获取备份列表失败');
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await axios.get('/api/system/logs', {
        params: { limit: 50 }
      });
      setLogs(response.data.logs || []);
    } catch (error: any) {
      handleApiError(error as any, '获取操作日志失败');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchHealthHistory = async () => {
    try {
      const response = await axios.get('/api/system/health/history');
      setHealthHistory(response.data);
    } catch (error: any) {
      handleApiError(error as any, '获取健康历史失败');
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      await axios.post('/api/system/backup');
      showSuccessMessage('备份创建成功');
      fetchBackups();
    } catch (error: any) {
      handleApiError(error as any, '创建备份失败');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await axios.get(`/api/system/backup/download/${filename}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccessMessage('备份下载成功');
    } catch (error: any) {
      handleApiError(error as any, '下载备份失败');
    }
  };

  const handleCleanupBackups = async () => {
    try {
      await axios.post('/api/system/backup/cleanup', { keepCount: 10 });
      showSuccessMessage('旧备份清理完成');
      fetchBackups();
    } catch (error: any) {
      handleApiError(error as any, '清理备份失败');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'critical':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#52c41a';
      case 'warning': return '#faad14';
      case 'critical': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const backupColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatBytes(size),
    },
    {
      title: '创建时间',
      dataIndex: 'created',
      key: 'created',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: BackupFile) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadBackup(record.name)}
          >
            下载
          </Button>
        </Space>
      ),
    },
  ];

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 100,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 80,
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
    },
  ];

  const tabItems: TabsProps['items'] = [
    {
      key: 'health',
      label: '系统健康',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 系统状态概览 */}
          {health && (
            <Card title="系统状态" extra={getStatusIcon(health.status)}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="系统状态"
                    value={health.status === 'healthy' ? '正常' : health.status === 'warning' ? '警告' : '严重'}
                    valueStyle={{ color: getStatusColor(health.status) }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="运行时间"
                    value={formatUptime(health.uptime)}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="数据库状态"
                    value={health.database.status === 'connected' ? '已连接' : '断开'}
                    valueStyle={{ color: health.database.status === 'connected' ? '#52c41a' : '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="响应时间"
                    value={health.database.responseTime || 0}
                    suffix="ms"
                  />
                </Col>
              </Row>
              
              {health.errors.length > 0 && (
                <Alert
                  message="系统警告"
                  description={health.errors.join(', ')}
                  type={health.status === 'critical' ? 'error' : 'warning'}
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          )}

          {/* 资源使用情况 */}
          {health && (
            <Row gutter={16}>
              <Col span={8}>
                <Card title="内存使用">
                  <Progress
                    type="circle"
                    percent={Math.round(health.memory.percentage)}
                    format={() => `${Math.round(health.memory.percentage)}%`}
                    strokeColor={health.memory.percentage > 80 ? '#ff4d4f' : '#52c41a'}
                  />
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text>{formatBytes(health.memory.used)} / {formatBytes(health.memory.total)}</Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="CPU使用">
                  <Progress
                    type="circle"
                    percent={Math.round(health.cpu.usage)}
                    format={() => `${Math.round(health.cpu.usage)}%`}
                    strokeColor={health.cpu.usage > 80 ? '#ff4d4f' : '#52c41a'}
                  />
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text>负载: {health.cpu.loadAverage[0].toFixed(2)}</Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="磁盘使用">
                  <Progress
                    type="circle"
                    percent={Math.round(health.disk.percentage)}
                    format={() => `${Math.round(health.disk.percentage)}%`}
                    strokeColor={health.disk.percentage > 80 ? '#ff4d4f' : '#52c41a'}
                  />
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text>{formatBytes(health.disk.used)} / {formatBytes(health.disk.total)}</Text>
                  </div>
                </Card>
              </Col>
            </Row>
          )}
        </Space>
      ),
    },
    {
      key: 'info',
      label: '系统信息',
      children: (
        <Card title="系统信息">
          {systemInfo && (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="主机名">{systemInfo.hostname}</Descriptions.Item>
              <Descriptions.Item label="平台">{systemInfo.platform}</Descriptions.Item>
              <Descriptions.Item label="架构">{systemInfo.arch}</Descriptions.Item>
              <Descriptions.Item label="Node.js版本">{systemInfo.nodeVersion}</Descriptions.Item>
              <Descriptions.Item label="CPU核心数">{systemInfo.cpuCount}</Descriptions.Item>
              <Descriptions.Item label="总内存">{formatBytes(systemInfo.totalMemory)}</Descriptions.Item>
              <Descriptions.Item label="系统运行时间" span={2}>
                {formatUptime(systemInfo.uptime)}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      ),
    },
    {
      key: 'backup',
      label: '数据备份',
      children: (
        <Card
          title="数据备份管理"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={handleCreateBackup}
                loading={backupLoading}
              >
                创建备份
              </Button>
              <Popconfirm
                title="确定要清理旧备份吗？"
                description="将保留最新的10个备份文件"
                onConfirm={handleCleanupBackups}
              >
                <Button icon={<DeleteOutlined />}>
                  清理旧备份
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <Table
            columns={backupColumns}
            dataSource={backups}
            rowKey="name"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'logs',
      label: '操作日志',
      children: (
        <Card
          title="操作日志"
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchLogs}
              loading={logsLoading}
            >
              刷新
            </Button>
          }
        >
          <Table
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            loading={logsLoading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 800 }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>系统管理</Title>
      
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchSystemHealth();
            fetchSystemInfo();
            fetchBackups();
            fetchLogs();
          }}
          loading={loading}
        >
          刷新所有数据
        </Button>
      </div>

      <Tabs items={tabItems} />
    </div>
  );
};

export default SystemManagement;