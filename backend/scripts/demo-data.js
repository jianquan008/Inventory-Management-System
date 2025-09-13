const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database/daigou.db';

async function insertDemoData() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('🎯 插入演示数据...');
  
  try {
    // 创建演示用户
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    db.serialize(() => {
      // 插入演示用户
      db.run(`
        INSERT OR IGNORE INTO users (username, password, role) 
        VALUES ('demo', ?, 'user')
      `, [hashedPassword]);
      
      // 插入演示库存数据
      const inventoryItems = [
        ['苹果', 50, 8.5],
        ['香蕉', 30, 6.0],
        ['橙子', 25, 7.5],
        ['牛奶', 20, 12.0],
        ['面包', 15, 5.5],
        ['鸡蛋', 100, 0.8],
        ['大米', 10, 25.0],
        ['食用油', 8, 35.0],
        ['洗发水', 12, 28.0],
        ['牙膏', 25, 15.0]
      ];
      
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO inventory (item_name, current_stock, unit_price) 
        VALUES (?, ?, ?)
      `);
      
      inventoryItems.forEach(item => {
        stmt.run(item);
      });
      
      stmt.finalize();
      
      // 插入演示收据数据
      db.run(`
        INSERT OR IGNORE INTO receipts (id, user_id, total_amount, created_at) 
        VALUES (1, 1, 156.5, '2024-01-15 10:30:00')
      `);
      
      // 插入演示收据项目
      const receiptItems = [
        [1, '苹果', 8.5, 5, 42.5],
        [1, '牛奶', 12.0, 3, 36.0],
        [1, '面包', 5.5, 4, 22.0],
        [1, '鸡蛋', 0.8, 20, 16.0],
        [1, '大米', 25.0, 1, 25.0],
        [1, '牙膏', 15.0, 1, 15.0]
      ];
      
      const receiptStmt = db.prepare(`
        INSERT OR IGNORE INTO receipt_items (receipt_id, item_name, unit_price, quantity, total_price) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      receiptItems.forEach(item => {
        receiptStmt.run(item);
      });
      
      receiptStmt.finalize();
      
      console.log('✅ 演示数据插入完成！');
      console.log('');
      console.log('📊 演示账户信息:');
      console.log('   管理员: admin / password');
      console.log('   普通用户: demo / demo123');
      console.log('');
      console.log('📦 已添加 10 种商品到库存');
      console.log('📄 已添加 1 张演示收据');
    });
    
  } catch (error) {
    console.error('❌ 插入演示数据失败:', error);
  } finally {
    db.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  insertDemoData();
}

module.exports = { insertDemoData };