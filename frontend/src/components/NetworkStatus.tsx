import React, { useState, useEffect } from 'react';
import { Alert } from 'antd';
import { WifiOutlined, DisconnectOutlined } from '@ant-design/icons';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowAlert(true);
      // 3秒后隐藏提示
      setTimeout(() => setShowAlert(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showAlert) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 64, 
      left: 0, 
      right: 0, 
      zIndex: 1000,
      padding: '0 16px'
    }}>
      <Alert
        message={isOnline ? '网络已连接' : '网络连接断开'}
        description={
          isOnline 
            ? '网络连接已恢复，您可以继续使用系统功能。'
            : '请检查您的网络连接，部分功能可能无法正常使用。'
        }
        type={isOnline ? 'success' : 'error'}
        icon={isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
        showIcon
        closable
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
};

export default NetworkStatus;