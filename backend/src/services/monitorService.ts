import fs from 'fs';
import os from 'os';
import { getDatabase } from '../database/init';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  errors: string[];
}

export class MonitorService {
  private static instance: MonitorService;
  private healthHistory: SystemHealth[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  public static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }

  /**
   * 获取系统健康状态
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const errors: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 内存使用情况
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    if (memoryPercentage > 90) {
      status = 'critical';
      errors.push('内存使用率过高');
    } else if (memoryPercentage > 70) {
      status = 'warning';
      errors.push('内存使用率较高');
    }

    // CPU使用情况
    const loadAverage = os.loadavg();
    const cpuCount = os.cpus().length;
    const cpuUsage = (loadAverage[0] / cpuCount) * 100;

    if (cpuUsage > 90) {
      status = 'critical';
      errors.push('CPU使用率过高');
    } else if (cpuUsage > 70) {
      status = 'warning';
      errors.push('CPU使用率较高');
    }

    // 磁盘使用情况
    const diskInfo = await this.getDiskUsage();
    if (diskInfo.percentage > 90) {
      status = 'critical';
      errors.push('磁盘空间不足');
    } else if (diskInfo.percentage > 80) {
      status = 'warning';
      errors.push('磁盘空间较少');
    }

    // 数据库连接状态
    const dbHealth = await this.checkDatabaseHealth();
    if (dbHealth.status === 'disconnected') {
      status = 'critical';
      errors.push('数据库连接失败');
    } else if (dbHealth.responseTime && dbHealth.responseTime > 1000) {
      status = 'warning';
      errors.push('数据库响应较慢');
    }

    const health: SystemHealth = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: memoryPercentage
      },
      cpu: {
        usage: cpuUsage,
        loadAverage
      },
      disk: diskInfo,
      database: dbHealth,
      errors
    };

    // 保存到历史记录
    this.addToHistory(health);

    return health;
  }

  /**
   * 检查数据库健康状态
   */
  private async checkDatabaseHealth(): Promise<{ status: 'connected' | 'disconnected'; responseTime?: number }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const db = getDatabase();

      db.get('SELECT 1', (err) => {
        const responseTime = Date.now() - startTime;
        db.close();

        if (err) {
          resolve({ status: 'disconnected' });
        } else {
          resolve({ status: 'connected', responseTime });
        }
      });
    });
  }

  /**
   * 获取磁盘使用情况
   */
  private async getDiskUsage(): Promise<{ used: number; total: number; percentage: number }> {
    return new Promise((resolve) => {
      fs.stat('.', (err, stats) => {
        if (err) {
          resolve({ used: 0, total: 0, percentage: 0 });
          return;
        }

        // 简化的磁盘使用计算
        const total = os.totalmem(); // 使用内存作为近似值
        const free = os.freemem();
        const used = total - free;
        const percentage = (used / total) * 100;

        resolve({ used, total, percentage });
      });
    });
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(health: SystemHealth): void {
    this.healthHistory.push(health);
    
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  /**
   * 获取健康历史记录
   */
  public getHealthHistory(): SystemHealth[] {
    return [...this.healthHistory];
  }

  /**
   * 启动监控
   */
  public startMonitoring(intervalMinutes: number = 5): void {
    const intervalMs = intervalMinutes * 60 * 1000;

    // 立即执行一次检查
    this.getSystemHealth().catch(err => {
      console.error('系统健康检查失败:', err);
    });

    // 设置定时检查
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        if (health.status === 'critical') {
          console.error('系统状态严重:', health.errors);
        } else if (health.status === 'warning') {
          console.warn('系统状态警告:', health.errors);
        }
      } catch (error) {
        console.error('系统监控失败:', error);
      }
    }, intervalMs);

    console.log(`系统监控已启动，检查间隔: ${intervalMinutes} 分钟`);
  }

  /**
   * 获取系统信息
   */
  public getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      networkInterfaces: os.networkInterfaces(),
      uptime: os.uptime()
    };
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.healthHistory = [];
  }
}