import { initDatabase } from '../src/database/init';
import fs from 'fs';
import path from 'path';

// 测试数据库路径
const TEST_DB_PATH = './tests/test.db';

beforeAll(async () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = 'test-secret';
  
  // 初始化测试数据库
  await initDatabase();
});

afterAll(async () => {
  // 清理测试数据库
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

beforeEach(() => {
  // 每个测试前的设置
  jest.clearAllMocks();
});

afterEach(() => {
  // 每个测试后的清理
});

// 全局测试工具函数
global.testUtils = {
  createTestUser: () => ({
    username: 'testuser',
    password: 'testpass123',
    role: 'user'
  }),
  
  createTestAdmin: () => ({
    username: 'testadmin',
    password: 'adminpass123',
    role: 'admin'
  }),
  
  createTestReceipt: () => ({
    items: [
      {
        name: '测试商品1',
        unitPrice: 10.5,
        quantity: 2,
        totalPrice: 21.0
      },
      {
        name: '测试商品2',
        unitPrice: 5.0,
        quantity: 1,
        totalPrice: 5.0
      }
    ],
    totalAmount: 26.0
  })
};