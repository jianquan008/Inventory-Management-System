import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../src/routes/auth';
import { initDatabase } from '../src/database/init';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // 首先注册一个用户
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'testpass123',
          role: 'user'
        });

      // 然后尝试登录
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.role).toBe('user');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('用户名或密码错误');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('用户名和密码不能为空');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'newpass123',
          role: 'user'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('用户注册成功');
    });

    it('should reject duplicate username', async () => {
      // 先注册一个用户
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate',
          password: 'pass123',
          role: 'user'
        });

      // 尝试注册相同用户名
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate',
          password: 'pass456',
          role: 'user'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('用户名已存在');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'incomplete'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('用户名和密码不能为空');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;

    beforeAll(async () => {
      // 注册并登录获取token
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'profileuser',
          password: 'pass123',
          role: 'user'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'profileuser',
          password: 'pass123'
        });

      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('profileuser');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });
});