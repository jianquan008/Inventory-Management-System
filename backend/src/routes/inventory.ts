import express from 'express';
import { getDatabase } from '../database/init';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';

const router = express.Router();

// 获取库存列表
router.get('/list', authenticateToken, logOperation('查看', '库存列表'), (req: AuthRequest, res) => {
  const { page = 1, limit = 20, search, sortBy = 'item_name', sortOrder = 'asc', lowStock } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  let whereClause = '1=1';
  const params: any[] = [];
  
  // 搜索过滤
  if (search) {
    whereClause += ' AND (item_name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  // 低库存过滤
  if (lowStock === 'true') {
    whereClause += ' AND current_stock <= 10';
  }
  
  // 排序
  const validSortFields = ['item_name', 'current_stock', 'unit_price', 'last_updated'];
  const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'item_name';
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
  
  const db = getDatabase();
  
  // 获取总数
  db.get(
    `SELECT COUNT(*) as total FROM inventory WHERE ${whereClause}`,
    params,
    (err, countResult: any) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: '获取库存统计失败' });
      }

      // 获取库存列表
      db.all(
        `SELECT * FROM inventory WHERE ${whereClause} ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset],
        (err, inventory) => {
          db.close();
          if (err) {
            return res.status(500).json({ error: '获取库存失败' });
          }
          
          res.json({
            items: inventory,
            total: countResult.total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(countResult.total / Number(limit))
          });
        }
      );
    }
  );
});

// 添加库存项目 (仅管理员)
router.post('/add', authenticateToken, requireAdmin, logOperation('添加', '库存项目'), (req: AuthRequest, res) => {
  const { item_name, description, current_stock, unit_price } = req.body;
  
  if (!item_name || current_stock < 0 || unit_price < 0) {
    return res.status(400).json({ error: '请提供有效的商品信息' });
  }
  
  const db = getDatabase();
  
  db.run(
    'INSERT INTO inventory (item_name, description, current_stock, unit_price) VALUES (?, ?, ?, ?)',
    [item_name.trim(), description?.trim() || null, current_stock, unit_price],
    function(err) {
      db.close();
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '商品名称已存在' });
        }
        return res.status(500).json({ error: '添加库存失败' });
      }
      
      res.status(201).json({ 
        message: '库存添加成功', 
        id: this.lastID 
      });
    }
  );
});

// 更新库存 (仅管理员)
router.put('/:id', authenticateToken, requireAdmin, logOperation('更新', '库存'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { item_name, description, current_stock, unit_price } = req.body;
  
  const db = getDatabase();
  
  db.run(
    'UPDATE inventory SET item_name = ?, description = ?, current_stock = ?, unit_price = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
    [item_name?.trim(), description?.trim() || null, current_stock, unit_price, id],
    function(err) {
      db.close();
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '商品名称已存在' });
        }
        return res.status(500).json({ error: '更新库存失败' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '库存项目不存在' });
      }
      
      res.json({ message: '库存更新成功' });
    }
  );
});

// 删除库存项目 (仅管理员)
router.delete('/:id', authenticateToken, requireAdmin, logOperation('删除', '库存项目'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
    db.close();
    if (err) {
      return res.status(500).json({ error: '删除库存失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '库存项目不存在' });
    }
    
    res.json({ message: '库存删除成功' });
  });
});

// 批量更新库存 (仅管理员)
router.post('/batch-update', authenticateToken, requireAdmin, logOperation('批量更新', '库存'), (req: AuthRequest, res) => {
  const { updates } = req.body;
  
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: '请提供有效的更新数据' });
  }
  
  const db = getDatabase();
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const stmt = db.prepare('UPDATE inventory SET current_stock = ?, unit_price = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?');
    
    let errorOccurred = false;
    
    updates.forEach((update: any) => {
      if (!errorOccurred) {
        stmt.run([update.current_stock, update.unit_price, update.id], (err) => {
          if (err) {
            errorOccurred = true;
          }
        });
      }
    });
    
    stmt.finalize();
    
    if (errorOccurred) {
      db.run('ROLLBACK');
      db.close();
      return res.status(500).json({ error: '批量更新失败' });
    }
    
    db.run('COMMIT', (err) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: '批量更新失败' });
      }
      res.json({ message: '批量更新成功' });
    });
  });
});

// 获取库存统计
router.get('/stats', authenticateToken, logOperation('查看', '库存统计'), (req: AuthRequest, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      COUNT(*) as total_items,
      SUM(current_stock) as total_stock,
      SUM(current_stock * unit_price) as total_value,
      COUNT(CASE WHEN current_stock <= 10 THEN 1 END) as low_stock_items,
      COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock_items
    FROM inventory
  `, (err, stats) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: '获取库存统计失败' });
    }
    
    // 获取最近更新的商品
    db.all(`
      SELECT item_name, current_stock, last_updated 
      FROM inventory 
      ORDER BY last_updated DESC 
      LIMIT 5
    `, (err, recentUpdates) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: '获取最近更新失败' });
      }
      
      res.json({
        ...(stats[0] || {}),
        recent_updates: recentUpdates
      });
    });
  });
});

// 设置库存阈值 (仅管理员)
router.post('/set-threshold', authenticateToken, requireAdmin, logOperation('设置', '库存阈值'), (req: AuthRequest, res) => {
  const { item_id, threshold } = req.body;
  
  if (!item_id || threshold < 0) {
    return res.status(400).json({ error: '请提供有效的阈值设置' });
  }
  
  // 这里可以扩展数据库表结构来支持每个商品的自定义阈值
  // 目前使用固定阈值10，将来可以添加threshold字段到inventory表
  
  res.json({ message: '阈值设置功能将在后续版本中实现' });
});

export default router;