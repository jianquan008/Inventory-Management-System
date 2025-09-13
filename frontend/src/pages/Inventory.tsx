import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Typography,
  Popconfirm,
  Alert,
  Row,
  Col,
  Statistic,
  Select,
  Switch,
  Tooltip,
  Tag,
  Divider
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  ExclamationCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import type { TableColumnsType, TableProps } from 'antd';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PermissionGuard from '../components/PermissionGuard';
import { handleApiError, showSuccessMessage } from '../utils/errorHandler';

const { Title } = Typography;

interface InventoryItem {
  id: number;
  item_name: string;
  current_stock: number;
  unit_price: number;
  last_updated: string;
}

interface InventoryStats {
  total_items: number;
  total_stock: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  recent_updates: Array<{
    item_name: string;
    current_stock: number;
    last_updated: string;
  }>;
}

interface InventoryResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  
  // 搜索和过滤状态
  const [searchText, setSearchText] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortField, setSortField] = useState('item_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  
  const [form] = Form.useForm();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchInventory();
    fetchStats();
  }, []);

  const fetchInventory = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const queryParams = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        lowStock: showLowStockOnly,
        sortBy: sortField,
        sortOrder: sortOrder,
        ...params
      };
      
      const response = await axios.get('/api/inventory/list', { params: queryParams });
      const data: InventoryResponse = response.data;
      
      setInventory(data.items);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        current: data.page
      }));
    } catch (error: any) {
      handleApiError(error as any, '获取库存失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, showLowStockOnly, sortField, sortOrder]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await axios.get('/api/inventory/stats');
      setStats(response.data);
    } catch (error: any) {
      handleApiError(error as any, '获取库存统计失败');
    } finally {
      setStatsLoading(false);
    }
  };

  // 搜索和过滤变化时重新获取数据
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory({ page: 1 });
    }, 500); // 防抖
    
    return () => clearTimeout(timer);
  }, [searchText, showLowStockOnly, sortField, sortOrder]);

  const handleAdd = () => {
    setIsAddMode(true);
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setIsAddMode(false);
    setEditingItem(item);
    form.setFieldsValue({
      item_name: item.item_name,
      current_stock: item.current_stock,
      unit_price: item.unit_price
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/inventory/${id}`);
      showSuccessMessage('删除成功');
      fetchInventory();
      fetchStats();
    } catch (error: any) {
      handleApiError(error as any, '删除失败');
    }
  };

  const handleSave = async (values: any) => {
    try {
      if (isAddMode) {
        await axios.post('/api/inventory/add', values);
        showSuccessMessage('添加成功');
      } else if (editingItem) {
        await axios.put(`/api/inventory/${editingItem.id}`, values);
        showSuccessMessage('更新成功');
      }
      
      setModalVisible(false);
      setEditingItem(null);
      setIsAddMode(false);
      form.resetFields();
      fetchInventory();
      fetchStats();
    } catch (error: any) {
      handleApiError(error as any, isAddMode ? '添加失败' : '保存失败');
    }
  };

  const handleTableChange: TableProps<InventoryItem>['onChange'] = (paginationConfig, filters, sorter) => {
    if (paginationConfig) {
      setPagination(prev => ({
        ...prev,
        current: paginationConfig.current || 1,
        pageSize: paginationConfig.pageSize || 20
      }));
    }
    
    if (sorter && !Array.isArray(sorter)) {
      setSortField(sorter.field as string || 'item_name');
      setSortOrder(sorter.order === 'descend' ? 'desc' : 'asc');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleLowStockFilter = (checked: boolean) => {
    setShowLowStockOnly(checked);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const columns: TableColumnsType<InventoryItem> = [
    {
      title: '商品名称',
      dataIndex: 'item_name',
      key: 'item_name',
      sorter: true,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '当前库存',
      dataIndex: 'current_stock',
      key: 'current_stock',
      sorter: true,
      width: 120,
      render: (stock: number) => {
        let color = '#52c41a';
        let icon = null;
        
        if (stock === 0) {
          color = '#ff4d4f';
          icon = <ExclamationCircleOutlined style={{ marginRight: 4 }} />;
        } else if (stock <= 10) {
          color = '#faad14';
          icon = <WarningOutlined style={{ marginRight: 4 }} />;
        }
        
        return (
          <span style={{ color }}>
            {icon}
            {stock}
          </span>
        );
      },
    },
    {
      title: '单价 (¥)',
      dataIndex: 'unit_price',
      key: 'unit_price',
      sorter: true,
      width: 120,
      render: (price: number) => `${price?.toFixed(2) || '0.00'}`,
    },
    {
      title: '库存价值 (¥)',
      key: 'total_value',
      sorter: false,
      width: 140,
      render: (record: InventoryItem) => {
        const value = (record.current_stock || 0) * (record.unit_price || 0);
        return (
          <span style={{ fontWeight: 'bold', color: value > 0 ? '#1890ff' : '#999' }}>
            {value.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '最后更新',
      dataIndex: 'last_updated',
      key: 'last_updated',
      sorter: true,
      width: 180,
      render: (date: string) => {
        const updateDate = new Date(date);
        const now = new Date();
        const diffHours = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);
        
        let color = '#666';
        if (diffHours < 24) color = '#52c41a';
        else if (diffHours < 72) color = '#faad14';
        
        return (
          <span style={{ color }}>
            {updateDate.toLocaleString('zh-CN')}
          </span>
        );
      },
    },
  ];

  if (isAdmin()) {
    columns.push({
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (record: InventoryItem) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个库存项目吗？"
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
        </Space>
      ),
    });
  }

  return (
    <div>
      <Title level={2}>库存管理</Title>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="商品总数"
              value={stats?.total_items || 0}
              prefix={<ShoppingCartOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="库存总价值"
              value={stats?.total_value || 0}
              precision={2}
              prefix="¥"
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="低库存商品"
              value={stats?.low_stock_items || 0}
              valueStyle={{ color: stats?.low_stock_items ? '#faad14' : '#52c41a' }}
              prefix={<WarningOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="缺货商品"
              value={stats?.out_of_stock_items || 0}
              valueStyle={{ color: stats?.out_of_stock_items ? '#ff4d4f' : '#52c41a' }}
              prefix={<ExclamationCircleOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 库存警告 */}
      {stats && stats.low_stock_items > 0 && (
        <Alert
          message="库存警告"
          description={`有 ${stats.low_stock_items} 项商品库存不足（≤10），其中 ${stats.out_of_stock_items} 项已缺货，请及时补货`}
          type="warning"
          icon={<ExclamationCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button 
              size="small" 
              type="link"
              onClick={() => handleLowStockFilter(true)}
            >
              查看详情
            </Button>
          }
        />
      )}

      {/* 权限提示 */}
      <PermissionGuard 
        requireAdmin={false}
        fallback={null}
      >
        {!isAdmin() && (
          <Alert
            message="权限提示"
            description="您当前只有查看权限，如需编辑库存请联系管理员"
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}
      </PermissionGuard>

      {/* 搜索和过滤 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="搜索商品名称"
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && handleSearch('')}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <span>只看低库存:</span>
              <Switch
                checked={showLowStockOnly}
                onChange={handleLowStockFilter}
                checkedChildren="是"
                unCheckedChildren="否"
              />
            </Space>
          </Col>
          <Col xs={24} sm={24} md={12}>
            <Space style={{ float: 'right' }}>
              <PermissionGuard requireAdmin>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleAdd}
                >
                  添加商品
                </Button>
              </PermissionGuard>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  fetchInventory();
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

      {/* 库存表格 */}
      <Card
        title={
          <Space>
            <span>库存列表</span>
            {showLowStockOnly && <Tag color="orange">仅显示低库存</Tag>}
            {searchText && <Tag color="blue">搜索: {searchText}</Tag>}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={inventory}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 项，共 ${total} 项`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* 添加/编辑模态框 */}
      <Modal
        title={isAddMode ? '添加商品' : '编辑库存'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingItem(null);
          setIsAddMode(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="item_name"
            label="商品名称"
            rules={[
              { required: true, message: '请输入商品名称' },
              { max: 100, message: '商品名称不能超过100个字符' }
            ]}
          >
            <Input 
              placeholder="请输入商品名称"
              disabled={!isAddMode}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="current_stock"
                label="当前库存"
                rules={[
                  { required: true, message: '请输入库存数量' },
                  { type: 'number', min: 0, message: '库存数量不能为负数' }
                ]}
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_price"
                label="单价 (¥)"
                rules={[
                  { required: true, message: '请输入单价' },
                  { type: 'number', min: 0, message: '单价不能为负数' }
                ]}
              >
                <InputNumber 
                  min={0} 
                  precision={2} 
                  style={{ width: '100%' }} 
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {isAddMode ? '添加' : '保存'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;