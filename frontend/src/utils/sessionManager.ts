import { message } from 'antd';

export class SessionManager {
  private static instance: SessionManager;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时
  private readonly WARNING_TIME = 5 * 60 * 1000; // 提前5分钟警告
  private onSessionExpired?: () => void;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public startSession(onExpired?: () => void) {
    this.onSessionExpired = onExpired;
    this.resetSessionTimer();
  }

  public resetSessionTimer() {
    // 清除现有的定时器
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    // 设置警告定时器
    this.warningTimeout = setTimeout(() => {
      message.warning({
        content: '您的登录即将过期，请保存当前工作',
        duration: 10,
      });
    }, this.SESSION_DURATION - this.WARNING_TIME);

    // 设置会话过期定时器
    this.sessionTimeout = setTimeout(() => {
      message.error('登录已过期，请重新登录');
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
    }, this.SESSION_DURATION);
  }

  public clearSession() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  public extendSession() {
    // 用户活动时延长会话
    this.resetSessionTimer();
  }
}

// 监听用户活动来延长会话
export const setupActivityListener = () => {
  const sessionManager = SessionManager.getInstance();
  
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  let lastActivity = Date.now();

  const handleActivity = () => {
    const now = Date.now();
    // 如果距离上次活动超过1分钟，则延长会话
    if (now - lastActivity > 60000) {
      sessionManager.extendSession();
      lastActivity = now;
    }
  };

  events.forEach(event => {
    document.addEventListener(event, handleActivity, true);
  });

  return () => {
    events.forEach(event => {
      document.removeEventListener(event, handleActivity, true);
    });
  };
};