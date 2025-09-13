import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './database/init';
import authRoutes from './routes/auth';
import receiptRoutes from './routes/receipts';
import inventoryRoutes from './routes/inventory';
import userRoutes from './routes/users';
import systemRoutes from './routes/system';
import { BackupService } from './services/backupService';
import { MonitorService } from './services/monitorService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// 速率限制 - 暂时注释掉，等待依赖安装
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15分钟
//   max: 100, // 限制每个IP 15分钟内最多100个请求
//   message: {
//     error: '请求过于频繁，请稍后再试'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15分钟
//   max: 5, // 限制每个IP 15分钟内最多5次登录尝试
//   message: {
//     error: '登录尝试过于频繁，请15分钟后再试'
//   },
//   skipSuccessfulRequests: true,
// });

// app.use('/api/', limiter);
// app.use('/api/auth/login', authLimiter);

// 请求解析中间件
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      (res as any).status(400).json({ error: '无效的JSON格式' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, data);
  };

  next();
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  etag: true,
}));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl,
    method: req.method
  });
});

// 全局错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('全局错误:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // 数据库错误
  if (err.code === 'SQLITE_BUSY') {
    return res.status(503).json({ error: '数据库繁忙，请稍后重试' });
  }

  if (err.code === 'SQLITE_LOCKED') {
    return res.status(503).json({ error: '数据库锁定，请稍后重试' });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: '数据验证失败', details: err.message });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: '无效的访问令牌' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: '访问令牌已过期' });
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超出限制' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: '不支持的文件类型' });
  }

  // 默认错误
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? '服务器内部错误' : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，开始优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，开始优雅关闭...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    await initDatabase();
    console.log('数据库初始化完成');

    const server = app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);

      // 启动系统服务
      startSystemServices();
    });

    // 设置服务器超时
    server.timeout = 30000; // 30秒超时

    return server;
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 启动系统服务
function startSystemServices() {
  try {
    // 启动备份服务
    const backupService = BackupService.getInstance();
    backupService.startAutoBackup(24); // 每24小时备份一次

    // 启动监控服务
    const monitorService = MonitorService.getInstance();
    monitorService.startMonitoring(5); // 每5分钟检查一次

    console.log('系统服务启动完成');
  } catch (error) {
    console.error('启动系统服务失败:', error);
  }
}

startServer();