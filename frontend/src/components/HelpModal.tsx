import React, { useState } from 'react';
import { Modal, Button, Tabs, List, Typography, Tag, Space } from 'antd';
import { QuestionCircleOutlined, ControlOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ visible, onClose }) => {
  const shortcuts = [
    { key: 'Ctrl + S', description: '保存当前内容' },
    { key: 'Ctrl + R', description: '刷新页面数据' },
    { key: 'Ctrl + F', description: '打开搜索功能' },
    { key: 'Ctrl + N', description: '创建新项目' },
    { key: 'Ctrl + H', description: '显示帮助信息' },
    { key: 'Esc', description: '关闭当前对话框' },
  ];

  const features = [
    {
      title: '收据识别',
      description: '上传收据图片，系统会自动识别商品信息，支持手写和机打收据。',
      tips: ['确保图片清晰', '光线充足', '避免反光']
    },
    {
      title: '库存管理',
      description: '实时查看和管理商品库存，支持批量操作和库存预警。',
      tips: ['定期检查低库存商品', '及时更新商品价格', '使用搜索功能快速定位']
    },
    {
      title: '历史记录',
      description: '查看所有采购历史，支持按时间、用户、商品等条件筛选。',
      tips: ['使用日期范围筛选', '导出数据进行分析', '查看统计报表']
    },
    {
      title: '用户管理',
      description: '管理系统用户和权限，仅管理员可用。',
      tips: ['合理分配用户权限', '定期检查用户活动', '及时删除无效账户']
    }
  ];

  const faq = [
    {
      question: '如何提高OCR识别准确率？',
      answer: '确保收据图片清晰、光线充足、避免反光。如果识别结果不准确，可以手动编辑后保存。'
    },
    {
      question: '忘记密码怎么办？',
      answer: '请联系系统管理员重置密码。管理员可以在用户管理页面为您重置密码。'
    },
    {
      question: '如何导出数据？',
      answer: '在历史记录页面，点击"导出CSV"按钮可以导出当前筛选条件下的所有数据。'
    },
    {
      question: '系统支持哪些图片格式？',
      answer: '系统支持 JPG、PNG、GIF 格式的图片，文件大小不超过 10MB。'
    }
  ];

  const tabItems = [
    {
      key: 'shortcuts',
      label: (
        <span>
          <ControlOutlined />
          快捷键
        </span>
      ),
      children: (
        <List
          dataSource={shortcuts}
          renderItem={item => (
            <List.Item>
              <Space>
                <Tag color="blue">{item.key}</Tag>
                <Text>{item.description}</Text>
              </Space>
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'features',
      label: (
        <span>
          <BookOutlined />
          功能说明
        </span>
      ),
      children: (
        <List
          dataSource={features}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={item.title}
                description={
                  <div>
                    <Paragraph>{item.description}</Paragraph>
                    <div>
                      <Text strong>使用技巧：</Text>
                      <ul>
                        {item.tips.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'faq',
      label: (
        <span>
          <QuestionCircleOutlined />
          常见问题
        </span>
      ),
      children: (
        <List
          dataSource={faq}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={<Text strong>{item.question}</Text>}
                description={item.answer}
              />
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <Modal
      title="帮助中心"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={800}
    >
      <Tabs items={tabItems} />
    </Modal>
  );
};

export default HelpModal;