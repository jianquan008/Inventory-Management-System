import { message } from 'antd';

export interface ApiError {
  response?: {
    status: number;
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

export const handleApiError = (error: ApiError, defaultMessage: string = '操作失败') => {
  let errorMessage = defaultMessage;

  if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.message) {
    errorMessage = error.message;
  }

  // 根据状态码显示不同的错误信息
  switch (error.response?.status) {
    case 400:
      message.error(`请求错误: ${errorMessage}`);
      break;
    case 401:
      message.error('登录已过期，请重新登录');
      break;
    case 403:
      message.error('权限不足');
      break;
    case 404:
      message.error('请求的资源不存在');
      break;
    case 500:
      message.error('服务器内部错误，请稍后重试');
      break;
    default:
      message.error(errorMessage);
  }

  return errorMessage;
};

export const showSuccessMessage = (msg: string) => {
  message.success(msg);
};

export const showWarningMessage = (msg: string) => {
  message.warning(msg);
};

export const showInfoMessage = (msg: string) => {
  message.info(msg);
};