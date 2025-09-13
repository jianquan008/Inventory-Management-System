import express from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../database/init';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import { logOperation, getOperationLogs } from '../middleware/logger';

const router = express.Router();

// 获取操作日志 (仅管理员)
router.get('/logs', authenticateToken, requireAdmin, getOperationLogs);

// 获取用户列表 (仅管理员)
router.get('/list', authenticateToken, requireAdmin, logOperation('查看', '用户列表'), (req: AuthRequest, res) => {
  const db = getDatabase();
  
  db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    db.close();
    if (err) {
      return res.status(500).json({ error: '获取用户列表失败' });
    }
    res.json(users);
  });
});

// 创建用户 (仅管理员)
router.post('/create', authenticateToken, requireAdmin, logOperation('创建', '用户'), async (req: AuthRequest, res) => {
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
      db.close();
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '用户名已存在' });
        }
        return res.status(500).json({ error: '创建用户失败' });
      }
      
      res.status(201).json({ message: '用户创建成功', userId: this.lastID });
    }
  );
});

// 更新用户 (仅管理员)
router.put('/:id', authenticateToken, requireAdmin, logOperation('更新', '用户'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  
  const db = getDatabase();
  
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'UPDATE users SET username = ?, password = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username, hashedPassword, role, id],
      function(err) {
        db.close();
        if (err) {
          return res.status(500).json({ error: '更新用户失败' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({ message: '用户更新成功' });
      }
    );
  } else {
    db.run(
      'UPDATE users SET username = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username, role, id],
      function(err) {
        db.close();
        if (err) {
          return res.status(500).json({ error: '更新用户失败' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({ message: '用户更新成功' });
      }
    );
  }
});

// 删除用户 (仅管理员)
router.delete('/:id', authenticateToken, requireAdmin, logOperation('删除', '用户'), (req: AuthRequest, res) => {
  const { id } = req.params;
  
  // 不能删除自己
  if (parseInt(id) === req.user!.id) {
    return res.status(400).json({ error: '不能删除自己的账户' });
  }
  
  const db = getDatabase();
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    db.close();
    if (err) {
      return res.status(500).json({ error: '删除用户失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ message: '用户删除成功' });
  });
});

export default router;