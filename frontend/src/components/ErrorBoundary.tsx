import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 这里可以将错误发送到错误报告服务
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="页面出现错误"
          subTitle="抱歉，页面出现了意外错误。请尝试刷新页面或返回首页。"
          extra={
            <div>
              <Button type="primary" onClick={this.handleReload} style={{ marginRight: 8 }}>
                刷新页面
              </Button>
              <Button onClick={this.handleGoHome}>
                返回首页
              </Button>
            </div>
          }
        >
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ 
              textAlign: 'left', 
              background: '#f5f5f5', 
              padding: '16px', 
              borderRadius: '4px',
              marginTop: '16px'
            }}>
              <h4>错误详情（开发模式）：</h4>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;