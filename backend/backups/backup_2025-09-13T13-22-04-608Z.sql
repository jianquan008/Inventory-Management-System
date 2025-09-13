-- Database Backup
-- Created at: 2025-09-13T13:22:04.608Z

-- Table: users
INSERT INTO users (id, username, password, role, created_at, updated_at) VALUES (1, 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '2025-09-13 07:20:02', '2025-09-13 07:20:02');

-- Table: operation_logs
INSERT INTO operation_logs (id, user_id, username, action, resource, details, ip_address, user_agent, created_at) VALUES (1, 1, 'admin', '查看', '库存统计', '{"method":"GET","url":"/api/inventory/stats","params":{},"query":{}}', '::ffff:127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-13T13:20:54.831Z');
INSERT INTO operation_logs (id, user_id, username, action, resource, details, ip_address, user_agent, created_at) VALUES (2, 1, 'admin', '查看', '收据列表', '{"method":"GET","url":"/api/receipts/list?limit=1000","params":{},"query":{"limit":"1000"}}', '::ffff:127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-13T13:20:54.837Z');

