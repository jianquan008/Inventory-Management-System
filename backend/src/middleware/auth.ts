import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export interface JWTPayload {
  id: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

// JWT认证中间件
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '访问令牌已过期' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: '无效的访问令牌' });
      }
      return res.status(403).json({ error: '令牌验证失败' });
    }

    const payload = decoded as JWTPayload;
    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role
    };
    
    next();
  });
};

// 管理员权限检查中间件
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: '用户未认证' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  next();
};

// 可选的管理员权限检查（不阻止请求，只是标记权限）
export const checkAdminOptional = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 这个中间件不会阻止请求，只是为后续处理提供权限信息
  // 已经通过 authenticateToken 的请求会有 req.user 信息
  next();
};

// 用户只能访问自己的资源或管理员可以访问所有资源
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '用户未认证' });
    }

    const resourceUserId = parseInt(req.params[userIdParam] || req.body[userIdParam]);
    
    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      return next();
    }

    // 普通用户只能访问自己的资源
    if (req.user.id === resourceUserId) {
      return next();
    }

    return res.status(403).json({ error: '权限不足，只能访问自己的资源' });
  };
};