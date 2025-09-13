import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/init';

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const db = getDatabase();

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user: any) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: '数据库错误' });
      }

      if (!user || !await bcrypt.compare(password, user.password)) {
        db.close();
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      db.close();
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    }
  );
});

// 获取当前用户信息
router.get('/profile', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const db = getDatabase();

    db.get(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [decoded.id],
      (err, user: any) => {
        db.close();
        if (err) {
          return res.status(500).json({ error: '数据库错误' });
        }

        if (!user) {
          return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ user });
      }
    );
  } catch (error) {
    return res.status(403).json({ error: '无效的访问令牌' });
  }
});

// 注册 (仅管理员可用)
router.post('/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const db = getDatabase();

  db.run(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPassword, role],
    function(err) {
      if (err) {
        db.close();
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '用户名已存在' });
        }
        return res.status(500).json({ error: '注册失败' });
      }

      db.close();
      res.status(201).json({ message: '用户注册成功', userId: this.lastID });
    }
  );
});

export default router;