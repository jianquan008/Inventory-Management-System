# 代购管理系统安装指南

## 环境要求

### 系统要求
- **操作系统**: Windows 10+, macOS 10.14+, Ubuntu 18.04+
- **Node.js**: 16.0.0 或更高版本
- **npm**: 7.0.0 或更高版本（或 yarn 1.22.0+）
- **内存**: 最少 2GB RAM
- **存储**: 最少 1GB 可用空间

### 依赖软件
- **SQLite3**: 用于数据存储
- **Tesseract**: OCR识别引擎（自动安装）

## 快速安装

### 1. 获取源代码
```bash
# 克隆项目（如果使用Git）
git clone <repository-url>
cd daigou-management-system

# 或者解压下载的源代码包
unzip daigou-management-system.zip
cd daigou-management-system
```

### 2. 安装依赖
```bash
# 安装所有依赖（前端+后端）
npm run install:all

# 或者分别安装
cd backend && npm install
cd ../frontend && npm install
```

### 3. 启动开发环境
```bash
# 返回项目根目录
cd ..

# 同时启动前后端开发服务器
npm run dev
```

### 4. 访问系统
- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:3001
- **API文档**: http://localhost:3001/api/health

## 详细安装步骤

### 步骤1: 环境准备

#### 安装Node.js
1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载并安装LTS版本
3. 验证安装：
```bash
node --version  # 应显示 v16.0.0 或更高
npm --version   # 应显示 7.0.0 或更高
```

#### 安装Git（可选）
如果需要从Git仓库克隆代码：
```bash
# Windows: 下载Git for Windows
# macOS: brew install git
# Ubuntu: sudo apt-get install git
```

### 步骤2: 项目配置

#### 创建环境配置文件
在 `backend` 目录下创建 `.env` 文件：

```bash
cd backend
cp .env.example .env  # 如果有示例文件
# 或者手动创建
```

`.env` 文件内容：
```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_PATH=./database/daigou.db

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# 前端URL（用于CORS）
FRONTEND_URL=http://localhost:3000

# 备份配置
BACKUP_PATH=./backups

# OCR配置
OCR_LANGUAGE=chi_sim+eng
```

#### 创建必要目录
```bash
# 在backend目录下
mkdir -p database uploads backups logs
```

### 步骤3: 数据库初始化

系统会在首次启动时自动初始化数据库，包括：
- 创建所有必要的表
- 插入默认管理员账户
- 设置初始配置

**默认管理员账户**:
- 用户名: `admin`
- 密码: `password`

⚠️ **安全提醒**: 首次登录后请立即修改默认密码！

### 步骤4: 启动服务

#### 开发环境启动
```bash
# 在项目根目录
npm run dev

# 或者分别启动
npm run dev:backend   # 启动后端 (端口3001)
npm run dev:frontend  # 启动前端 (端口3000)
```

#### 生产环境启动
```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

## 高级配置

### 数据库配置

#### 自定义数据库位置
```env
# 绝对路径
DB_PATH=/var/lib/daigou/database.db

# 相对路径
DB_PATH=./data/production.db
```

#### 数据库备份
```bash
# 手动创建备份
curl -X POST http://localhost:3001/api/system/backup \
  -H "Authorization: Bearer <your-token>"

# 自动备份（每24小时）
# 在.env中配置
AUTO_BACKUP_INTERVAL=24
```

### 文件上传配置

```env
# 上传目录
UPLOAD_PATH=./uploads

# 最大文件大小（字节）
MAX_FILE_SIZE=10485760  # 10MB

# 允许的文件类型
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
```

### 安全配置

#### JWT配置
```env
# JWT密钥（生产环境必须修改）
JWT_SECRET=your-256-bit-secret

# Token过期时间
JWT_EXPIRES_IN=24h
```

#### 速率限制
```env
# API请求限制（每15分钟）
RATE_LIMIT_REQUESTS=100

# 登录尝试限制（每15分钟）
LOGIN_RATE_LIMIT=5
```

### 反向代理配置

#### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件
    location /uploads/ {
        alias /path/to/backend/uploads/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :3000  # 前端端口
lsof -i :3001  # 后端端口

# 杀死占用进程
kill -9 <PID>

# 或者修改端口
PORT=3002 npm run dev:backend
```

#### 2. 依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 使用yarn替代npm
yarn install
```

#### 3. 数据库权限问题
```bash
# 检查数据库文件权限
ls -la backend/database/

# 修改权限
chmod 664 backend/database/daigou.db
chmod 755 backend/database/
```

#### 4. OCR识别失败
```bash
# 检查Tesseract安装
npm list tesseract.js

# 重新安装OCR依赖
cd backend
npm uninstall tesseract.js
npm install tesseract.js
```

#### 5. 文件上传失败
```bash
# 检查上传目录权限
ls -la backend/uploads/

# 创建上传目录
mkdir -p backend/uploads
chmod 755 backend/uploads
```

### 日志查看

#### 应用日志
```bash
# 后端日志
tail -f backend/logs/app.log

# 错误日志
tail -f backend/logs/error.log

# 访问日志
tail -f backend/logs/access.log
```

#### 系统日志
```bash
# 查看系统资源使用
curl http://localhost:3001/api/system/health

# 查看系统信息
curl http://localhost:3001/api/system/info
```

### 性能优化

#### 数据库优化
```sql
-- 创建索引（如果需要）
CREATE INDEX idx_receipts_created_at ON receipts(created_at);
CREATE INDEX idx_inventory_item_name ON inventory(item_name);
```

#### 文件清理
```bash
# 清理旧的上传文件
find backend/uploads -type f -mtime +30 -delete

# 清理旧的备份文件
find backend/backups -type f -mtime +7 -delete
```

## 测试安装

### 运行测试套件
```bash
# 后端测试
cd backend
npm test

# 前端测试
cd frontend
npm test

# 覆盖率测试
npm run test:coverage
```

### 手动测试
1. 访问 http://localhost:3000
2. 使用默认账户登录
3. 测试各个功能模块
4. 上传测试收据图片
5. 检查数据是否正确保存

## 生产部署

### 构建生产版本
```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd ../backend
npm run build
```

### 使用PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

### Docker部署
```dockerfile
# Dockerfile示例
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

## 维护和更新

### 定期维护任务
1. **数据备份**: 每日自动备份
2. **日志清理**: 每周清理旧日志
3. **系统监控**: 监控系统资源使用
4. **安全更新**: 定期更新依赖包

### 更新系统
```bash
# 备份数据
curl -X POST http://localhost:3001/api/system/backup

# 停止服务
pm2 stop all

# 更新代码
git pull origin main

# 安装新依赖
npm run install:all

# 重新构建
npm run build

# 启动服务
pm2 start all
```

## 技术支持

如果遇到安装问题，请：

1. 检查系统要求是否满足
2. 查看错误日志获取详细信息
3. 参考故障排除部分
4. 联系技术支持团队

---

**版本**: 1.0.0  
**更新日期**: 2023年12月  
**支持**: 代购管理系统技术团队