import React, { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Table,
  Input,
  InputNumber,
  Typography,
  message,
  Space,
  Divider,
  Image,
  Spin,
  Progress,
  Alert,
  Tooltip,
  Tag
} from 'antd';
import { 
  UploadOutlined, 
  SaveOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import axios from 'axios';
import { handleApiError, showSuccessMessage } from '../utils/errorHandler';

const { Title, Text } = Typography;

interface ReceiptItem {
  key?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

interface OCRResult {
  imagePath: string;
  ocrText: string;
  parsedItems: ReceiptItem[];
  confidence: number;
  suggestedTotal?: number;
}

const ReceiptOCR: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showOcrText, setShowOcrText] = useState(false);

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      // 检查文件类型
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
        return false;
      }
      
      // 检查文件大小 (10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('图片大小不能超过 10MB！');
        return false;
      }
      
      return false; // 阻止自动上传
    },
    fileList,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
      // 清除之前的识别结果
      if (newFileList.length === 0) {
        setOcrResult(null);
        setItems([]);
      }
    },
    maxCount: 1,
    accept: 'image/*',
    onDrop: (e) => {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const handleOCR = async () => {
    if (fileList.length === 0) {
      message.error('请先选择收据图片');
      return;
    }

    const formData = new FormData();
    formData.append('receipt', fileList[0].originFileObj as File);

    setLoading(true);
    setUploadProgress(0);
    
    try {
      const response = await axios.post('/api/receipts/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(progress);
        }
      });

      const result = response.data;
      setOcrResult(result);
      
      // 为每个项目添加key
      const itemsWithKeys = result.parsedItems.map((item: ReceiptItem, index: number) => ({
        ...item,
        key: index.toString()
      }));
      
      setItems(itemsWithKeys);
      
      showSuccessMessage(`OCR识别完成，识别置信度: ${(result.confidence || 0).toFixed(1)}%`);
      
      // 如果识别置信度较低，给出提示
      if (result.confidence < 70) {
        message.warning('识别置信度较低，请仔细检查识别结果');
      }
    } catch (error: any) {
      handleApiError(error as any, 'OCR识别失败');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      message.error('没有可保存的项目');
      return;
    }

    // 验证所有项目都有有效的数据
    const invalidItems = items.filter(item => 
      !item.name.trim() || item.unitPrice <= 0 || item.quantity <= 0
    );
    
    if (invalidItems.length > 0) {
      message.error('请确保所有项目都有有效的名称、单价和数量');
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    setSaving(true);
    try {
      await axios.post('/api/receipts/save', {
        imagePath: ocrResult?.imagePath,
        items: items.map(item => ({
          name: item.name.trim(),
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice
        })),
        totalAmount
      });

      showSuccessMessage('收据保存成功');
      
      // 重置表单
      setFileList([]);
      setOcrResult(null);
      setItems([]);
      setShowOcrText(false);
    } catch (error: any) {
      handleApiError(error as any, '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleItemChange = (key: string, field: string, value: any) => {
    const newItems = items.map(item => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };
        // 自动计算总价
        if (field === 'unitPrice' || field === 'quantity') {
          updatedItem.totalPrice = updatedItem.unitPrice * updatedItem.quantity;
        }
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      key: Date.now().toString(),
      name: '',
      unitPrice: 0,
      quantity: 1,
      totalPrice: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) {
      message.warning('至少需要保留一个项目');
      return;
    }
    setItems(items.filter(item => item.key !== key));
  };

  const resetForm = () => {
    setFileList([]);
    setOcrResult(null);
    setItems([]);
    setShowOcrText(false);
    message.info('已重置表单');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ReceiptItem) => (
        <Input
          value={text}
          onChange={(e) => handleItemChange(record.key!, 'name', e.target.value)}
          placeholder="请输入商品名称"
          status={!text.trim() ? 'error' : ''}
        />
      ),
    },
    {
      title: '单价 (¥)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (value: number, record: ReceiptItem) => (
        <InputNumber
          value={value}
          onChange={(val) => handleItemChange(record.key!, 'unitPrice', val || 0)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
          status={value <= 0 ? 'error' : ''}
        />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value: number, record: ReceiptItem) => (
        <InputNumber
          value={value}
          onChange={(val) => handleItemChange(record.key!, 'quantity', val || 1)}
          min={1}
          style={{ width: '100%' }}
          status={value <= 0 ? 'error' : ''}
        />
      ),
    },
    {
      title: '总价 (¥)',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 120,
      render: (value: number) => (
        <span style={{ fontWeight: 'bold', color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: ReceiptItem) => (
        <Tooltip title="删除此项目">
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeItem(record.key!)}
            disabled={items.length <= 1}
          />
        </Tooltip>
      ),
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div>
      <Title level={2}>收据识别</Title>

      <Card 
        title="上传收据图片" 
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button onClick={resetForm} disabled={loading || saving}>
              重置
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="使用提示"
            description="支持 JPG、PNG、GIF 格式图片，文件大小不超过 10MB。为获得最佳识别效果，请确保图片清晰、光线充足。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Upload.Dragger {...uploadProps} style={{ padding: '20px' }}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持单个文件上传，仅支持图片格式</p>
          </Upload.Dragger>
          
          {loading && (
            <div>
              <Progress 
                percent={uploadProgress} 
                status="active" 
                strokeColor="#1890ff"
              />
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Spin /> <span style={{ marginLeft: 8 }}>正在识别中，请稍候...</span>
              </div>
            </div>
          )}
          
          <Button 
            type="primary" 
            size="large"
            onClick={handleOCR}
            loading={loading}
            disabled={fileList.length === 0}
            block
          >
            {loading ? '识别中...' : '开始识别'}
          </Button>
        </Space>
      </Card>

      {ocrResult && (
        <Card 
          title={
            <Space>
              <span>识别结果</span>
              <Tag color={getConfidenceColor(ocrResult.confidence)}>
                置信度: {ocrResult.confidence.toFixed(1)}%
              </Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
          extra={
            <Button 
              type="link" 
              icon={<EyeOutlined />}
              onClick={() => setShowOcrText(!showOcrText)}
            >
              {showOcrText ? '隐藏' : '查看'}原始文本
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>上传的图片:</Text>
              <div style={{ marginTop: 8 }}>
                <Image
                  width={200}
                  src={`/uploads/${ocrResult.imagePath}`}
                  alt="收据图片"
                  style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}
                />
              </div>
            </div>
            
            {showOcrText && (
              <>
                <Divider />
                <div>
                  <Text strong>OCR识别原始文本:</Text>
                  <div style={{ 
                    marginTop: 8, 
                    padding: 12, 
                    background: '#f5f5f5', 
                    borderRadius: 4,
                    maxHeight: 200,
                    overflow: 'auto',
                    border: '1px solid #d9d9d9'
                  }}>
                    <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                      {ocrResult.ocrText}
                    </Text>
                  </div>
                </div>
              </>
            )}

            {ocrResult.suggestedTotal && (
              <Alert
                message={`建议总金额: ¥${ocrResult.suggestedTotal.toFixed(2)}`}
                type="info"
                showIcon
              />
            )}
          </Space>
        </Card>
      )}

      {items.length > 0 && (
        <Card 
          title={
            <Space>
              <span>编辑识别结果</span>
              <Tag color="blue">{items.length} 个项目</Tag>
            </Space>
          }
          extra={
            <Space>
              <Tooltip title="添加新项目">
                <Button 
                  icon={<PlusOutlined />} 
                  onClick={addItem}
                  disabled={saving}
                >
                  添加项目
                </Button>
              </Tooltip>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                disabled={items.some(item => !item.name.trim() || item.unitPrice <= 0 || item.quantity <= 0)}
              >
                {saving ? '保存中...' : '保存收据'}
              </Button>
            </Space>
          }
        >
          <Alert
            message="编辑提示"
            description="请仔细检查识别结果，确保商品名称、单价和数量正确。红色边框表示需要修正的字段。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Table
            columns={columns}
            dataSource={items}
            pagination={false}
            size="middle"
            bordered
            footer={() => (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 0'
              }}>
                <Space>
                  <Text>共 {items.length} 个项目</Text>
                  {ocrResult?.suggestedTotal && (
                    <Text type="secondary">
                      (建议总额: ¥{ocrResult.suggestedTotal.toFixed(2)})
                    </Text>
                  )}
                </Space>
                <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                  总计: ¥{totalAmount.toFixed(2)}
                </Text>
              </div>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default ReceiptOCR;