import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Typography,
  Space,
  Image,
  Descriptions,
  message,
  Row,
  Col,
  DatePicker,
  Input,
  Select,
  Statistic,
  Tag,
  Tooltip,
  Popconfirm,
  Divider,
  Alert
} from 'antd';
import { 
  EyeOutlined, 
  DownloadOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { TableColumnsType, TableProps } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PermissionGuard from '../components/PermissionGuard';
import { handleApiError, showSuccessMessage } from '../utils/errorHandler';

const { Title, Text } = Typography;

interface Receipt {
  id: number;
  user_id: number;
  username: string;
  image_path: string;
  total_amount: number;
  created_at: string;
  updated_at?: string;
}

interface ReceiptItem {
  id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

interface ReceiptDetail extends Receipt {
  items: ReceiptItem[];
}

interface ReceiptResponse {
  receipts: Receipt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface HistoryStats {
  summary: {
    total_receipts: number;
    total_value: number;
    avg_value: number;
    min_value: number;
    max_value: number;
    unique_users: number;
  };
  daily_stats: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  popular_items: Array<{
    item_name: string;
    frequency: number;
    total_quantity: number;
    total_value: number;
  }>;
}

const { RangePicker } = DatePicker;
const { Option } = Select;

const History: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // 搜索和过滤状态
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchReceipts();
    fetchStats();
  }, []);

  const fetchReceipts = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const queryParams: Record<string, any> = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        sortBy: sortField,
        sortOrder: sortOrder,
        ...params
      };
      
      // 过滤掉空值
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === undefined || queryParams[key] === '') {
          delete queryParams[key];
        }
      });
      
      const response = await axios.get('/api/receipts/list', { params: queryParams });
      const data: ReceiptResponse = response.data;
      
      setReceipts(data.receipts);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        current: data.page
      }));
    } catch (error: any) {
      handleApiError(error as any, '获取历史单据失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, dateRange, sortField, sortOrder]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const queryParams: Record<string, any> = {
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      
      // 过滤掉空值
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      
      const response = await axios.get('/api/receipts/stats', { params: queryParams });
      setStats(response.data);
    } catch (error: any) {
      handleApiError(error as any, '获取统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  };

  // 搜索和过滤变化时重新获取数据
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReceipts({ page: 1 });
      fetchStats();
    }, 500); // 防抖
    
    return () => clearTimeout(timer);
  }, [searchText, dateRange]);

  const handleViewDetail = async (receiptId: number) => {
    setDetailLoading(true);
    try {
      const response = await axios.get(`/api/receipts/${receiptId}`);
      setSelectedReceipt(response.data);
      setDetailVisible(true);
    } catch (error: any) {
      handleApiError(error as any, '获取收据详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (receiptId: number) => {
    try {
      await axios.delete(`/api/receipts/${receiptId}`);
      showSuccessMessage('删除成功');
      fetchReceipts();
      fetchStats();
    } catch (error: any) {
      handleApiError(error as any, '删除失败');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const queryParams: Record<string, any> = {
        search: searchText,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      
      // 过滤掉空值
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === undefined || queryParams[key] === '') {
          delete queryParams[key];
        }
      });
      
      const response = await axios.get('/api/receipts/export/csv', { 
        params: queryParams,
        responseType: 'blob'
      });
      
      // 创建下载链接
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipts_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccessMessage('导出成功');
    } catch (error: any) {
      handleApiError(error as any, '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleTableChange: TableProps<Receipt>['onChange'] = (paginationConfig, filters, sorter) => {
    if (paginationConfig) {
      setPagination(prev => ({
        ...prev,
        current: paginationConfig.current || 1,
        pageSize: paginationConfig.pageSize || 20
      }));
    }
    
    if (sorter && !Array.isArray(sorter)) {
      setSortField(sorter.field as string || 'created_at');
      setSortOrder(sorter.order === 'descend' ? 'desc' : 'asc');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDateRangeChange: RangePickerProps['onChange'] = (dates) => {
    setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const resetFilters = () => {
    setSearchText('');
    setDateRange(null);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const columns: TableColumnsType<Receipt> = [
    {
      title: '收据ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: true,
    },
    {
      title: '录入人',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '总金额 (¥)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      sorter: true,
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: true,
      render: (date: string) => {
        const createDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let color = '#666';
        if (diffDays === 0) color = '#52c41a';
        else if (diffDays <= 7) color = '#1890ff';
        
        return (
          <span style={{ color }}>
            {createDate.toLocaleString('zh-CN')}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (record: Receipt) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
              loading={detailLoading}
            />
          </Tooltip>
          <PermissionGuard requireAdmin>
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  // 这里可以添加编辑功能
                  message.info('编辑功能将在后续版本中实现');
                }}
              />
            </Tooltip>
            <Popconfirm
              title="确定要删除这条记录吗？"
              description="删除后无法恢复，请谨慎操作。"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    {
      title: '商品名称',
      dataIndex: 'item_name',
      key: 'item_name',
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '总价',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
  ];

  return (
    <div>
      <Title level={2}>历史单据</Title>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总收据数"
                value={stats.summary.total_receipts}
                prefix={<CalendarOutlined />}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总金额"
                value={stats.summary.total_value}
                precision={2}
                prefix="¥"
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="平均金额"
                value={stats.summary.avg_value}
                precision={2}
                prefix="¥"
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="参与用户"
                value={stats.summary.unique_users}
                loading={statsLoading}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 搜索和过滤 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder="搜索收据ID或用户名"
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && handleSearch('')}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col xs={24} sm={24} md={10}>
            <Space style={{ float: 'right' }}>
              <Button onClick={resetFilters}>
                重置筛选
              </Button>
              <Button 
                icon={<BarChartOutlined />}
                onClick={() => setStatsVisible(true)}
              >
                查看统计
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
              >
                导出CSV
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  fetchReceipts();
                  fetchStats();
                }}
                loading={loading || statsLoading}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 收据列表 */}
      <Card
        title={
          <Space>
            <span>收据列表</span>
            {searchText && <Tag color="blue">搜索: {searchText}</Tag>}
            {dateRange && (
              <Tag color="green">
                {dateRange[0].format('YYYY-MM-DD')} ~ {dateRange[1].format('YYYY-MM-DD')}
              </Tag>
            )}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={receipts}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* 收据详情模态框 */}
      <Modal
        title={`收据详情 - #${selectedReceipt?.id}`}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedReceipt(null);
        }}
        footer={null}
        width={900}
      >
        {selectedReceipt && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="收据ID">{selectedReceipt.id}</Descriptions.Item>
              <Descriptions.Item label="录入人">{selectedReceipt.username}</Descriptions.Item>
              <Descriptions.Item label="总金额" span={2}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                  ¥{selectedReceipt.total_amount?.toFixed(2) || '0.00'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedReceipt.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="商品数量">
                {selectedReceipt.items?.length || 0} 项
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={16}>
              {selectedReceipt.image_path && (
                <Col xs={24} md={8}>
                  <div>
                    <Text strong>收据图片:</Text>
                    <div style={{ marginTop: 8 }}>
                      <Image
                        width="100%"
                        src={`/uploads/${selectedReceipt.image_path}`}
                        alt="收据图片"
                        style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}
                      />
                    </div>
                  </div>
                </Col>
              )}
              <Col xs={24} md={selectedReceipt.image_path ? 16 : 24}>
                <div>
                  <Text strong>商品明细:</Text>
                  <Table
                    columns={itemColumns}
                    dataSource={selectedReceipt.items}
                    rowKey="id"
                    pagination={false}
                    style={{ marginTop: 8 }}
                    size="small"
                    bordered
                    footer={() => (
                      <div style={{ textAlign: 'right', padding: '8px 0' }}>
                        <Text strong style={{ fontSize: '14px' }}>
                          合计: ¥{selectedReceipt.items?.reduce((sum, item) => sum + item.total_price, 0).toFixed(2) || '0.00'}
                        </Text>
                      </div>
                    )}
                  />
                </div>
              </Col>
            </Row>
          </Space>
        )}
      </Modal>

      {/* 统计详情模态框 */}
      <Modal
        title="历史记录统计"
        open={statsVisible}
        onCancel={() => setStatsVisible(false)}
        footer={null}
        width={1000}
      >
        {stats && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 基础统计 */}
            <Card title="基础统计" size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="最小金额" value={stats.summary.min_value} precision={2} prefix="¥" />
                </Col>
                <Col span={8}>
                  <Statistic title="最大金额" value={stats.summary.max_value} precision={2} prefix="¥" />
                </Col>
                <Col span={8}>
                  <Statistic title="平均金额" value={stats.summary.avg_value} precision={2} prefix="¥" />
                </Col>
              </Row>
            </Card>

            {/* 热门商品 */}
            <Card title="热门商品 TOP 10" size="small">
              <Table
                columns={[
                  { title: '商品名称', dataIndex: 'item_name', key: 'item_name' },
                  { title: '购买次数', dataIndex: 'frequency', key: 'frequency' },
                  { title: '总数量', dataIndex: 'total_quantity', key: 'total_quantity' },
                  { 
                    title: '总价值 (¥)', 
                    dataIndex: 'total_value', 
                    key: 'total_value',
                    render: (value: number) => value.toFixed(2)
                  },
                ]}
                dataSource={stats.popular_items}
                rowKey="item_name"
                pagination={false}
                size="small"
              />
            </Card>

            {/* 日统计 */}
            <Card title="最近30天统计" size="small">
              <Table
                columns={[
                  { title: '日期', dataIndex: 'date', key: 'date' },
                  { title: '收据数量', dataIndex: 'count', key: 'count' },
                  { 
                    title: '当日金额 (¥)', 
                    dataIndex: 'amount', 
                    key: 'amount',
                    render: (value: number) => value.toFixed(2)
                  },
                ]}
                dataSource={stats.daily_stats}
                rowKey="date"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default History;