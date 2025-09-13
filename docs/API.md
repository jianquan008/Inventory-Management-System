# API 文档

## 基础信息

- **基础URL**: `http://localhost:3001/api`
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`

## 认证接口 (`/auth`)

### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": 1,
    "username": "testuser",
    "role": "user"
  }
}
```

**错误响应**:
- `400`: 用户名和密码不能为空
- `401`: 用户名或密码错误

### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "role": "user|admin"
}
```

**响应**:
```json
{
  "message": "用户注册成功",
  "userId": 1
}
```

### 获取用户信息
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

**响应**:
```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "role": "user",
    "createdAt": "2023-12-01T00:00:00.000Z"
  }
}
```

## 收据管理接口 (`/receipts`)

### OCR识别收据
```http
POST /api/receipts/ocr
Authorization: Bearer <token>
Content-Type: multipart/form-data

receipt: <image_file>
```

**响应**:
```json
{
  "imagePath": "receipt-123456.jpg",
  "ocrText": "识别出的原始文本",
  "parsedItems": [
    {
      "name": "商品名称",
      "unitPrice": 10.5,
      "quantity": 2,
      "totalPrice": 21.0
    }
  ],
  "confidence": 85.5,
  "suggestedTotal": 21.0
}
```

### 保存收据数据
```http
POST /api/receipts/save
Authorization: Bearer <token>
Content-Type: application/json

{
  "imagePath": "receipt-123456.jpg",
  "items": [
    {
      "name": "商品名称",
      "unitPrice": 10.5,
      "quantity": 2,
      "totalPrice": 21.0
    }
  ],
  "totalAmount": 21.0
}
```

### 获取收据列表
```http
GET /api/receipts/list?page=1&limit=20&startDate=2023-01-01&endDate=2023-12-31&search=keyword
Authorization: Bearer <token>
```

**响应**:
```json
{
  "receipts": [
    {
      "id": 1,
      "userId": 1,
      "username": "testuser",
      "imagePath": "receipt-123456.jpg",
      "totalAmount": 21.0,
      "createdAt": "2023-12-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### 获取收据详情
```http
GET /api/receipts/:id
Authorization: Bearer <token>
```

### 更新收据 (仅管理员)
```http
PUT /api/receipts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [...],
  "totalAmount": 21.0
}
```

### 删除收据 (仅管理员)
```http
DELETE /api/receipts/:id
Authorization: Bearer <token>
```

### 导出收据数据
```http
GET /api/receipts/export/csv?startDate=2023-01-01&endDate=2023-12-31
Authorization: Bearer <token>
```

### 获取收据统计
```http
GET /api/receipts/stats?startDate=2023-01-01&endDate=2023-12-31
Authorization: Bearer <token>
```

## 库存管理接口 (`/inventory`)

### 获取库存列表
```http
GET /api/inventory/list?page=1&limit=20&search=keyword&lowStock=true&sortBy=item_name&sortOrder=asc
Authorization: Bearer <token>
```

**响应**:
```json
{
  "items": [
    {
      "id": 1,
      "item_name": "商品名称",
      "current_stock": 10,
      "unit_price": 15.5,
      "last_updated": "2023-12-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### 添加库存项目 (仅管理员)
```http
POST /api/inventory/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "item_name": "新商品",
  "current_stock": 100,
  "unit_price": 25.0
}
```

### 更新库存 (仅管理员)
```http
PUT /api/inventory/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_stock": 50,
  "unit_price": 20.0
}
```

### 删除库存项目 (仅管理员)
```http
DELETE /api/inventory/:id
Authorization: Bearer <token>
```

### 批量更新库存 (仅管理员)
```http
POST /api/inventory/batch-update
Authorization: Bearer <token>
Content-Type: application/json

{
  "updates": [
    {
      "id": 1,
      "current_stock": 50,
      "unit_price": 20.0
    }
  ]
}
```

### 获取库存统计
```http
GET /api/inventory/stats
Authorization: Bearer <token>
```

**响应**:
```json
{
  "total_items": 100,
  "total_stock": 5000,
  "total_value": 125000.50,
  "low_stock_items": 5,
  "out_of_stock_items": 2,
  "recent_updates": [...]
}
```

## 用户管理接口 (`/users`) - 仅管理员

### 获取用户列表
```http
GET /api/users/list
Authorization: Bearer <token>
```

### 创建用户
```http
POST /api/users/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

### 更新用户
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "updateduser",
  "password": "newpassword",
  "role": "admin"
}
```

### 删除用户
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

### 获取操作日志
```http
GET /api/users/logs?page=1&limit=50&userId=1&action=创建&startDate=2023-01-01&endDate=2023-12-31
Authorization: Bearer <token>
```

## 系统管理接口 (`/system`) - 仅管理员

### 获取系统健康状态
```http
GET /api/system/health
Authorization: Bearer <token>
```

### 获取系统信息
```http
GET /api/system/info
Authorization: Bearer <token>
```

### 创建数据备份
```http
POST /api/system/backup
Authorization: Bearer <token>
```

### 获取备份列表
```http
GET /api/system/backups
Authorization: Bearer <token>
```

### 下载备份文件
```http
GET /api/system/backup/download/:filename
Authorization: Bearer <token>
```

### 清理旧备份
```http
POST /api/system/backup/cleanup
Authorization: Bearer <token>
Content-Type: application/json

{
  "keepCount": 10
}
```

## 错误响应格式

所有API错误响应都遵循以下格式：

```json
{
  "error": "错误描述信息",
  "details": "详细错误信息 (可选)"
}
```

### 常见HTTP状态码

- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权 (需要登录)
- `403`: 权限不足
- `404`: 资源不存在
- `413`: 文件过大
- `429`: 请求过于频繁
- `500`: 服务器内部错误
- `503`: 服务不可用

## 速率限制

- 一般API: 每15分钟最多100次请求
- 登录API: 每15分钟最多5次请求
- 文件上传: 最大10MB

## 认证说明

除了登录和注册接口外，所有API都需要在请求头中包含JWT token：

```
Authorization: Bearer <your_jwt_token>
```

Token有效期为24小时，过期后需要重新登录获取新token。