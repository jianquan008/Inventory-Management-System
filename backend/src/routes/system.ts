import express from 'express';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { BackupService } from '../services/backupService';
import { MonitorService } from '../services/monitorService';

const router = express.Router();

// 获取系统健康状态
router.get('/health', authenticateToken, requireAdmin, logOperation('查看', '系统健康状态'), async (req: AuthRequest, res) => {
  try {
    const monitorService = MonitorService.getInstance();
    const health = await monitorService.getSystemHealth();
    res.json(health);
  } catch (error) {
    console.error('获取系统健康状态失败:', error);
    res.status(500).json({ error: '获取系统健康状态失败' });
  }
});

// 获取系统信息
router.get('/info', authenticateToken, requireAdmin, logOperation('查看', '系统信息'), (req: AuthRequest, res) => {
  try {
    const monitorService = MonitorService.getInstance();
    const info = monitorService.getSystemInfo();
    res.json(info);
  } catch (error) {
    console.error('获取系统信息失败:', error);
    res.status(500).json({ error: '获取系统信息失败' });
  }
});

// 获取健康历史记录
router.get('/health/history', authenticateToken, requireAdmin, logOperation('查看', '系统健康历史'), (req: AuthRequest, res) => {
  try {
    const monitorService = MonitorService.getInstance();
    const history = monitorService.getHealthHistory();
    res.json(history);
  } catch (error) {
    console.error('获取健康历史失败:', error);
    res.status(500).json({ error: '获取健康历史失败' });
  }
});

// 创建数据库备份
router.post('/backup', authenticateToken, requireAdmin, logOperation('创建', '数据库备份'), async (req: AuthRequest, res) => {
  try {
    const backupService = BackupService.getInstance();
    const backupPath = await backupService.createBackup();
    res.json({ 
      message: '备份创建成功', 
      backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    res.status(500).json({ error: '创建备份失败' });
  }
});

// 获取备份列表
router.get('/backups', authenticateToken, requireAdmin, logOperation('查看', '备份列表'), (req: AuthRequest, res) => {
  try {
    const backupService = BackupService.getInstance();
    const backups = backupService.getBackupList();
    res.json(backups);
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({ error: '获取备份列表失败' });
  }
});

// 下载备份文件
router.get('/backup/download/:filename', authenticateToken, requireAdmin, logOperation('下载', '备份文件'), (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    const backupService = BackupService.getInstance();
    const backups = backupService.getBackupList();
    
    const backup = backups.find(b => b.name === filename);
    if (!backup) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    res.download(backup.path, filename, (err) => {
      if (err) {
        console.error('下载备份文件失败:', err);
        res.status(500).json({ error: '下载失败' });
      }
    });
  } catch (error) {
    console.error('下载备份文件失败:', error);
    res.status(500).json({ error: '下载备份文件失败' });
  }
});

// 清理旧备份
router.post('/backup/cleanup', authenticateToken, requireAdmin, logOperation('清理', '旧备份'), (req: AuthRequest, res) => {
  try {
    const { keepCount = 10 } = req.body;
    const backupService = BackupService.getInstance();
    backupService.cleanOldBackups(keepCount);
    res.json({ message: '旧备份清理完成' });
  } catch (error) {
    console.error('清理旧备份失败:', error);
    res.status(500).json({ error: '清理旧备份失败' });
  }
});

// 获取操作日志
router.get('/logs', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  const { getOperationLogs } = require('../middleware/logger');
  getOperationLogs(req, res);
});

// 系统重启（仅在开发环境）
router.post('/restart', authenticateToken, requireAdmin, logOperation('重启', '系统'), (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '生产环境不允许重启' });
  }

  res.json({ message: '系统将在3秒后重启' });
  
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});

export default router;