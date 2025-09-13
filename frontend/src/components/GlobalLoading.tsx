import React from 'react';
import { Spin } from 'antd';

interface GlobalLoadingProps {
  loading: boolean;
  tip?: string;
  children: React.ReactNode;
}

const GlobalLoading: React.FC<GlobalLoadingProps> = ({ 
  loading, 
  tip = '加载中...', 
  children 
}) => {
  return (
    <Spin 
      spinning={loading} 
      tip={tip}
      size="large"
      style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {children}
    </Spin>
  );
};

export default GlobalLoading;