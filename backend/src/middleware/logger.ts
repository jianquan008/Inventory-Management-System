import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/init';
import { AuthRequest } from './auth';

export interface LogEntry {
  userId?: number;
  username?: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

// 操作日志中间件
export const logOperation = (action: string, resource: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // 只在成功响应时记录日志
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logEntry: LogEntry = {
          userId: req.user?.id,
          username: req.user?.username,
          action,
          resource,
          details: JSON.stringify({
            method: req.method,
            url: req.originalUrl,
            params: req.params,
            query: req.query,
            // 不记录敏感信息如密码
            body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
          }),
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          timestamp: new Date().toISOString()
        };

        // 异步记录日志，不阻塞响应
        setImmediate(() => {
          recordLog(logEntry);
        });
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
};

// 记录日志到数据库
const recordLog = (logEntry: LogEntry) => {
  const db = getDatabase();
  
  db.run(`
    INSERT INTO operation_logs (
      user_id, username, action, resource, details, 
      ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    logEntry.userId,
    logEntry.username,
    logEntry.action,
    logEntry.resource,
    logEntry.details,
    logEntry.ipAddress,
    logEntry.userAgent,
    logEntry.timestamp
  ], (err) => {
    if (err) {
      console.error('记录操作日志失败:', err);
    }
    db.close();
  });
};

// 清理敏感信息
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // 移除密码字段
  if (sanitized.password) {
    sanitized.password = '[REDACTED]';
  }
  
  // 移除其他敏感字段
  const sensitiveFields = ['token', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

// 获取操作日志
export const getOperationLogs = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  let whereClause = '1=1';
  const params: any[] = [];
  
  if (userId) {
    whereClause += ' AND user_id = ?';
    params.push(userId);
  }
  
  if (action) {
    whereClause += ' AND action LIKE ?';
    params.push(`%${action}%`);
  }
  
  if (startDate) {
    whereClause += ' AND created_at >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND created_at <= ?';
    params.push(endDate);
  }

  const db = getDatabase();
  
  // 获取总数
  db.get(
    `SELECT COUNT(*) as total FROM operation_logs WHERE ${whereClause}`,
    params,
    (err, countResult: any) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: '获取日志统计失败' });
      }

      // 获取日志列表
      db.all(
        `SELECT * FROM operation_logs 
         WHERE ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset],
        (err, logs) => {
          db.close();
          if (err) {
            return res.status(500).json({ error: '获取操作日志失败' });
          }

          res.json({
            logs,
            total: countResult.total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(countResult.total / Number(limit))
          });
        }
      );
    }
  );
};