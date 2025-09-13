import fs from 'fs';
import path from 'path';
import { getDatabase } from '../database/init';

export class BackupService {
  private static instance: BackupService;
  private backupDir: string;

  private constructor() {
    this.backupDir = process.env.BACKUP_PATH || './backups';
    this.ensureBackupDirectory();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 创建数据库备份
   */
  public async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, backupFileName);

    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      // 获取所有表的数据
      const tables = ['users', 'receipts', 'receipt_items', 'inventory', 'operation_logs'];
      let sqlContent = '-- Database Backup\n';
      sqlContent += `-- Created at: ${new Date().toISOString()}\n\n`;

      let completedTables = 0;

      tables.forEach(tableName => {
        db.all(`SELECT * FROM ${tableName}`, (err, rows: any[]) => {
          if (err) {
            db.close();
            return reject(new Error(`备份表 ${tableName} 失败: ${err.message}`));
          }

          if (rows.length > 0) {
            // 生成INSERT语句
            sqlContent += `-- Table: ${tableName}\n`;
            
            rows.forEach(row => {
              const columns = Object.keys(row).join(', ');
              const values = Object.values(row).map(value => {
                if (value === null) return 'NULL';
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                return value;
              }).join(', ');
              
              sqlContent += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
            });
            
            sqlContent += '\n';
          }

          completedTables++;
          if (completedTables === tables.length) {
            db.close();
            
            // 写入备份文件
            fs.writeFile(backupPath, sqlContent, 'utf8', (writeErr) => {
              if (writeErr) {
                return reject(new Error(`写入备份文件失败: ${writeErr.message}`));
              }
              
              console.log(`数据库备份完成: ${backupPath}`);
              resolve(backupPath);
            });
          }
        });
      });
    });
  }

  /**
   * 获取备份列表
   */
  public getBackupList(): Array<{ name: string; path: string; size: number; created: Date }> {
    try {
      const files = fs.readdirSync(this.backupDir);
      
      return files
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error('获取备份列表失败:', error);
      return [];
    }
  }

  /**
   * 删除旧备份
   */
  public cleanOldBackups(keepCount: number = 10): void {
    try {
      const backups = this.getBackupList();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        
        toDelete.forEach(backup => {
          fs.unlinkSync(backup.path);
          console.log(`删除旧备份: ${backup.name}`);
        });
      }
    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }

  /**
   * 自动备份任务
   */
  public startAutoBackup(intervalHours: number = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // 立即执行一次备份
    this.createBackup().catch(err => {
      console.error('初始备份失败:', err);
    });

    // 设置定时备份
    setInterval(async () => {
      try {
        await this.createBackup();
        this.cleanOldBackups();
      } catch (error) {
        console.error('自动备份失败:', error);
      }
    }, intervalMs);

    console.log(`自动备份已启动，间隔: ${intervalHours} 小时`);
  }

  /**
   * 恢复数据库（从备份文件）
   */
  public async restoreFromBackup(backupPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(backupPath)) {
        return reject(new Error('备份文件不存在'));
      }

      fs.readFile(backupPath, 'utf8', (err, sqlContent) => {
        if (err) {
          return reject(new Error(`读取备份文件失败: ${err.message}`));
        }

        const db = getDatabase();
        
        // 执行SQL语句
        db.exec(sqlContent, (execErr) => {
          db.close();
          
          if (execErr) {
            return reject(new Error(`恢复数据库失败: ${execErr.message}`));
          }
          
          console.log(`数据库恢复完成: ${backupPath}`);
          resolve();
        });
      });
    });
  }
}