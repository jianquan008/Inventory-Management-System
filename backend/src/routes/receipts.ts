import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../database/init';
import { authenticateToken, AuthRequest, requireAdmin, checkAdminOptional } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { OCRService } from '../services/ocrService';

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

// OCR识别收据
router.post('/ocr', authenticateToken, logOperation('OCR识别', '收据'), upload.single('receipt'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传收据图片' });
  }

  try {
    const ocrService = OCRService.getInstance();
    
    // 预处理图片（如果需要）
    const processedImagePath = await ocrService.preprocessImage(req.file.path);
    
    // 进行OCR识别
    const ocrResult = await ocrService.recognizeReceipt(processedImagePath);
    
    res.json({
      imagePath: req.file.filename,
      ocrText: ocrResult.text,
      parsedItems: ocrResult.items,
      confidence: ocrResult.confidence,
      suggestedTotal: ocrResult.totalAmount
    });
  } catch (error) {
    console.error('OCR识别失败:', error);
    
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'OCR识别失败，请检查图片质量或重新上传' });
  }
});

// 保存收据数据
router.post('/save', authenticateToken, logOperation('保存', '收据'), async (req: AuthRequest, res) => {
  const { imagePath, items, totalAmount } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '收据项目不能为空' });
  }

  const db = getDatabase();
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 插入收据记录
    db.run(
      'INSERT INTO receipts (user_id, image_path, total_amount) VALUES (?, ?, ?)',
      [req.user!.id, imagePath, totalAmount],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          db.close();
          return res.status(500).json({ error: '保存收据失败' });
        }
        
        const receiptId = this.lastID;
        
        // 插入收据项目
        const stmt = db.prepare('INSERT INTO receipt_items (receipt_id, item_name, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?)');
        
        items.forEach((item: any) => {
          stmt.run([receiptId, item.name, item.unitPrice, item.quantity, item.totalPrice]);
          
          // 更新库存
          db.run(`
            INSERT INTO inventory (item_name, current_stock, unit_price) 
            VALUES (?, ?, ?)
            ON CONFLICT(item_name) DO UPDATE SET
              current_stock = current_stock + ?,
              unit_price = ?,
              last_updated = CURRENT_TIMESTAMP
          `, [item.name, item.quantity, item.unitPrice, item.quantity, item.unitPrice]);
        });
        
        stmt.finalize();
        
        db.run('COMMIT', (err) => {
          db.close();
          if (err) {
            return res.status(500).json({ error: '保存失败' });
          }
          res.json({ message: '收据保存成功', receiptId });
        });
      }
    );
  });
});

// 获取收据列表
router.get('/list', authenticateToken, logOperation('查看', '收据列表'), (req: AuthRequest, res) => {
  const { page = 1, limit = 20, startDate, endDate, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  let whereClause = '1=1';
  const params: any[] = [];
  
  // 日期范围过滤
  if (startDate) {
    whereClause += ' AND r.created_at >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND r.created_at <= ?';
    params.push(endDate);
  }
  
  // 搜索过滤（按用户名或收据ID）
  if (search) {
    whereClause += ' AND (u.username LIKE ? OR r.id = ?)';
    params.push(`%${search}%`, search);
  }
  
  const db = getDatabase();
  
  // 获取总数
  db.get(
    `SELECT COUNT(*) as total FROM receipts r JOIN users u ON r.user_id = u.id WHERE ${whereClause}`,
    params,
    (err, countResult: any) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: '获取收据统计失败' });
      }

      // 获取收据列表
      db.all(`
        SELECT r.*, u.username 
        FROM receipts r 
        JOIN users u ON r.user_id = u.id 
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, Number(limit), offset], (err, receipts) => {
        db.close();
        if (err) {
          return res.status(500).json({ error: '获取收据列表失败' });
        }
        
        res.json({
          receipts,
          total: countResult.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(countResult.total / Number(limit))
        });
      });
    }
  );
  
  db.all(`
    SELECT r.*, u.username 
    FROM receipts r 
    JOIN users u ON r.user_id = u.id 
    ORDER BY r.created_at DESC
  `, (err, receipts) => {
    db.close();
    if (err) {
      return res.status(500).json({ error: '获取收据列表失败' });
    }
    res.json(receipts);
  });
});

// 获取收据详情
router.get('/:id', authenticateToken, logOperation('查看', '收据详情'), (req: AuthRequest, res) => {
  const receiptId = req.params.id;
  const db = getDatabase();
  
  db.get('SELECT * FROM receipts WHERE id = ?', [receiptId], (err, receipt) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: '获取收据失败' });
    }
    
    if (!receipt) {
      db.close();
      return res.status(404).json({ error: '收据不存在' });
    }
    
    db.all('SELECT * FROM receipt_items WHERE receipt_id = ?', [receiptId], (err, items) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: '获取收据项目失败' });
      }
      
      res.json({ ...receipt, items });
    });
  });
});

// 更新收据 (仅管理员)
router.put('/:id', authenticateToken, requireAdmin, logOperation('更新', '收据'), async (req: AuthRequest, res) => {
  const receiptId = req.params.id;
  const { items, totalAmount } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '收据项目不能为空' });
  }

  const db = getDatabase();
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 更新收据总金额
    db.run(
      'UPDATE receipts SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [totalAmount, receiptId],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          db.close();
          return res.status(500).json({ error: '更新收据失败' });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          db.close();
          return res.status(404).json({ error: '收据不存在' });
        }
        
        // 删除原有的收据项目
        db.run('DELETE FROM receipt_items WHERE receipt_id = ?', [receiptId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            db.close();
            return res.status(500).json({ error: '删除原收据项目失败' });
          }
          
          // 插入新的收据项目
          const stmt = db.prepare('INSERT INTO receipt_items (receipt_id, item_name, unit_price, quantity, total_price) VALUES (?, ?, ?, ?, ?)');
          
          items.forEach((item: any) => {
            stmt.run([receiptId, item.name, item.unitPrice, item.quantity, item.totalPrice]);
          });
          
          stmt.finalize();
          
          db.run('COMMIT', (err) => {
            db.close();
            if (err) {
              return res.status(500).json({ error: '更新失败' });
            }
            res.json({ message: '收据更新成功' });
          });
        });
      }
    );
  });
});

// 删除收据 (仅管理员)
router.delete('/:id', authenticateToken, requireAdmin, logOperation('删除', '收据'), (req: AuthRequest, res) => {
  const receiptId = req.params.id;
  const db = getDatabase();
  
  // 先获取收据信息以删除关联的图片文件
  db.get('SELECT image_path FROM receipts WHERE id = ?', [receiptId], (err, receipt: any) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: '获取收据信息失败' });
    }
    
    if (!receipt) {
      db.close();
      return res.status(404).json({ error: '收据不存在' });
    }
    
    // 删除收据记录（级联删除收据项目）
    db.run('DELETE FROM receipts WHERE id = ?', [receiptId], function(err) {
      db.close();
      if (err) {
        return res.status(500).json({ error: '删除收据失败' });
      }
      
      // 删除关联的图片文件
      if (receipt.image_path) {
        const imagePath = path.join(process.env.UPLOAD_PATH || './uploads', receipt.image_path);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      res.json({ message: '收据删除成功' });
    });
  });
});

// 重新识别收据 (管理员功能)
router.post('/:id/reprocess', authenticateToken, requireAdmin, logOperation('重新识别', '收据'), async (req: AuthRequest, res) => {
  const receiptId = req.params.id;
  const db = getDatabase();
  
  // 获取收据的图片路径
  db.get('SELECT image_path FROM receipts WHERE id = ?', [receiptId], async (err, receipt: any) => {
    db.close();
    if (err) {
      return res.status(500).json({ error: '获取收据信息失败' });
    }
    
    if (!receipt || !receipt.image_path) {
      return res.status(404).json({ error: '收据或图片不存在' });
    }
    
    try {
      const imagePath = path.join(process.env.UPLOAD_PATH || './uploads', receipt.image_path);
      const ocrService = OCRService.getInstance();
      const ocrResult = await ocrService.recognizeReceipt(imagePath);
      
      res.json({
        ocrText: ocrResult.text,
        parsedItems: ocrResult.items,
        confidence: ocrResult.confidence,
        suggestedTotal: ocrResult.totalAmount
      });
    } catch (error) {
      console.error('重新识别失败:', error);
      res.status(500).json({ error: '重新识别失败' });
    }
  });
});

// 导出历史记录 (CSV格式)
router.get('/export/csv', authenticateToken, logOperation('导出', '历史记录CSV'), (req: AuthRequest, res) => {
  const { startDate, endDate, search } = req.query;
  
  let whereClause = '1=1';
  const params: any[] = [];
  
  if (startDate) {
    whereClause += ' AND r.created_at >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND r.created_at <= ?';
    params.push(endDate);
  }
  
  if (search) {
    whereClause += ' AND (u.username LIKE ? OR r.id = ?)';
    params.push(`%${search}%`, search);
  }
  
  const db = getDatabase();
  
  db.all(`
    SELECT 
      r.id as receipt_id,
      u.username,
      r.total_amount,
      r.created_at,
      ri.item_name,
      ri.unit_price,
      ri.quantity,
      ri.total_price
    FROM receipts r 
    JOIN users u ON r.user_id = u.id 
    LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
    WHERE ${whereClause}
    ORDER BY r.created_at DESC, ri.id
  `, params, (err, rows: any[]) => {
    db.close();
    if (err) {
      return res.status(500).json({ error: '导出数据失败' });
    }
    
    // 生成CSV内容
    const csvHeader = 'Receipt ID,Username,Item Name,Unit Price,Quantity,Item Total,Receipt Total,Created At\n';
    const csvRows = rows.map(row => {
      return [
        row.receipt_id,
        row.username,
        row.item_name || '',
        row.unit_price || '',
        row.quantity || '',
        row.total_price || '',
        row.total_amount,
        new Date(row.created_at).toLocaleString('zh-CN')
      ].map(field => `"${field}"`).join(',');
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="receipts_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csvContent); // 添加BOM以支持中文
  });
});

// 获取历史记录统计
router.get('/stats', authenticateToken, logOperation('查看', '历史记录统计'), (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;
  
  let whereClause = '1=1';
  const params: any[] = [];
  
  if (startDate) {
    whereClause += ' AND created_at >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND created_at <= ?';
    params.push(endDate);
  }
  
  const db = getDatabase();
  
  db.all(`
    SELECT 
      COUNT(*) as total_receipts,
      SUM(total_amount) as total_value,
      AVG(total_amount) as avg_value,
      MIN(total_amount) as min_value,
      MAX(total_amount) as max_value,
      COUNT(DISTINCT user_id) as unique_users
    FROM receipts 
    WHERE ${whereClause}
  `, params, (err, stats) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: '获取统计数据失败' });
    }
    
    db.close();
    res.json({
      summary: stats[0] || {
        total_receipts: 0,
        total_value: 0,
        avg_value: 0,
        min_value: 0,
        max_value: 0,
        unique_users: 0
      },
      daily_stats: [],
      popular_items: []
    });
  });
});

export default router;