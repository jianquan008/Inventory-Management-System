import React from 'react';
import { Space, Button, Dropdown, Popconfirm, Typography } from 'antd';
import { 
  DeleteOutlined, 
  EditOutlined, 
  DownOutlined, 
  ExportOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface BatchAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  onClick: (selectedKeys: React.Key[]) => void;
}

interface BatchActionsProps {
  selectedRowKeys: React.Key[];
  totalCount: number;
  actions: BatchAction[];
  onClearSelection: () => void;
}

const BatchActions: React.FC<BatchActionsProps> = ({
  selectedRowKeys,
  totalCount,
  actions,
  onClearSelection
}) => {
  if (selectedRowKeys.length === 0) {
    return null;
  }

  const handleActionClick = (action: BatchAction) => {
    action.onClick(selectedRowKeys);
  };

  const menuItems = actions.map(action => {
    const item = {
      key: action.key,
      label: action.label,
      icon: action.icon,
      danger: action.danger,
      onClick: () => handleActionClick(action)
    };

    if (action.confirmTitle) {
      return {
        ...item,
        label: (
          <Popconfirm
            title={action.confirmTitle}
            description={action.confirmDescription}
            onConfirm={() => handleActionClick(action)}
            okText="确定"
            cancelText="取消"
          >
            <span>{action.label}</span>
          </Popconfirm>
        )
      };
    }

    return item;
  });

  return (
    <div style={{ 
      padding: '12px 16px', 
      background: '#f0f8ff', 
      border: '1px solid #d4edda',
      borderRadius: '6px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <Space>
        <CheckOutlined style={{ color: '#52c41a' }} />
        <Text>
          已选择 <Text strong>{selectedRowKeys.length}</Text> 项
          {totalCount > 0 && (
            <Text type="secondary"> / 共 {totalCount} 项</Text>
          )}
        </Text>
      </Space>

      <Space>
        {actions.length > 0 && (
          <>
            {actions.length === 1 ? (
              actions[0].confirmTitle ? (
                <Popconfirm
                  title={actions[0].confirmTitle}
                  description={actions[0].confirmDescription}
                  onConfirm={() => handleActionClick(actions[0])}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button 
                    type="primary"
                    icon={actions[0].icon}
                    danger={actions[0].danger}
                  >
                    {actions[0].label}
                  </Button>
                </Popconfirm>
              ) : (
                <Button 
                  type="primary"
                  icon={actions[0].icon}
                  danger={actions[0].danger}
                  onClick={() => handleActionClick(actions[0])}
                >
                  {actions[0].label}
                </Button>
              )
            ) : (
              <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
              >
                <Button type="primary">
                  批量操作 <DownOutlined />
                </Button>
              </Dropdown>
            )}
          </>
        )}
        
        <Button 
          icon={<CloseOutlined />}
          onClick={onClearSelection}
        >
          取消选择
        </Button>
      </Space>
    </div>
  );
};

export default BatchActions;