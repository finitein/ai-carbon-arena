# 部署手册 (Deployment Guide)

## 1. 概述

本文档描述 Phase 1 (v0.1) 的部署流程。Phase 1 采用 **单台云服务器 + Docker Compose** 的部署方案。

### 服务器配置

| 配置项 | 推荐 |
|--------|------|
| **CPU** | 4 核 |
| **内存** | 8 GB |
| **磁盘** | 40 GB SSD |
| **系统** | Ubuntu 22.04 LTS |
| **云厂商** | 阿里云 ECS / 腾讯云 CVM / AWS EC2 |
| **预估月成本** | ¥300-800 |

## 2. 服务器初始化

### 2.1 安装 Docker + Docker Compose

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker compose version
```

### 2.2 安装 Nginx（用于 SSL 终止）

```bash
sudo apt install -y nginx
```

### 2.3 配置防火墙

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 3. SSL 证书配置

使用 Let's Encrypt 免费证书：

```bash
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（替换为实际域名）
sudo certbot --nginx -d arena.example.com

# 设置自动续期
sudo certbot renew --dry-run
```

## 4. 环境变量

在服务器上创建 `.env` 文件：

```bash
# .env

# ===== 数据库 =====
POSTGRES_USER=arena
POSTGRES_PASSWORD=<生成强密码>
POSTGRES_DB=carbon_arena
DATABASE_URL=postgresql://arena:<密码>@postgres:5432/carbon_arena

# ===== Redis =====
REDIS_URL=redis://redis:6379

# ===== 后端服务 =====
NODE_ENV=production
PORT=8055
WS_PORT=8056

# ===== 前端 =====
FRONTEND_PORT=3055

# ===== 安全 =====
API_KEY_SECRET=<生成 32 字节随机字符串>
SESSION_SECRET=<生成 32 字节随机字符串>

# ===== 对局日志 =====
JSONL_LOG_DIR=/data/logs
# S3/OSS 归档（可选，Phase 1 可先不配）
# S3_BUCKET=carbon-arena-logs
# S3_REGION=ap-southeast-1
# S3_ACCESS_KEY=xxx
# S3_SECRET_KEY=xxx

# ===== 前端 =====
NEXT_PUBLIC_API_URL=https://arena.example.com/api
NEXT_PUBLIC_WS_URL=wss://arena.example.com/ws

# ===== 域名 =====
DOMAIN=arena.example.com
```

> ⚠️ **`.env` 文件不要提交到 Git！** 已在 `.gitignore` 中排除。

### 生成密码 / Secret

```bash
openssl rand -base64 32
```

## 5. Docker Compose 部署

### 5.1 拉取代码并构建

```bash
git clone https://github.com/<org>/carbon-silicon-arena.git
cd carbon-silicon-arena

# 构建镜像
docker compose build
```

### 5.2 启动服务

```bash
# 首次启动（含数据库初始化）
docker compose up -d

# 查看日志
docker compose logs -f

# 查看服务状态
docker compose ps
```

### 5.3 数据库初始化

首次部署需执行数据库迁移：

```bash
# 进入后端容器执行迁移
docker compose exec backend npx prisma migrate deploy

# 或使用 Drizzle（取决于最终 ORM 选型）
# docker compose exec backend npx drizzle-kit push
```

### 5.4 注册基线机器人

首次部署后，注册官方基线机器人：

```bash
# 进入后端容器
docker compose exec backend node scripts/register-baseline-bots.js
```

## 6. Nginx 配置

```nginx
# /etc/nginx/sites-available/arena.example.com

upstream backend {
    server 127.0.0.1:8055;
}

upstream websocket {
    server 127.0.0.1:8056;
}

upstream frontend {
    server 127.0.0.1:3055;
}

server {
    listen 443 ssl http2;
    server_name arena.example.com;

    ssl_certificate /etc/letsencrypt/live/arena.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/arena.example.com/privkey.pem;

    # REST API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket — Agent
    location /ws/agent {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # WebSocket — Observer
    location /ws/observer {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # 前端
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name arena.example.com;
    return 301 https://$host$request_uri;
}
```

```bash
# 启用站点配置
sudo ln -s /etc/nginx/sites-available/arena.example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. 运维操作

### 7.1 更新部署

```bash
cd carbon-silicon-arena
git pull origin main
docker compose build
docker compose up -d
```

### 7.2 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend

# 查看对局 JSONL 日志
ls -la /data/logs/
```

### 7.3 数据库备份

```bash
# 手动备份
docker compose exec postgres pg_dump -U arena carbon_arena > backup_$(date +%Y%m%d).sql

# 恢复
docker compose exec -i postgres psql -U arena carbon_arena < backup_20260320.sql
```

### 7.4 重启服务

```bash
# 重启全部
docker compose restart

# 重启单个服务
docker compose restart backend
```

## 8. 监控与告警

### 8.1 健康检查

```bash
# 后端健康检查
curl https://arena.example.com/api/health

# 预期返回
# {"status":"ok","version":"0.1.0","uptime":12345}
```

### 8.2 核心监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| 后端进程存活 | Docker 容器状态 | 容器退出时告警 |
| WebSocket 连接数 | 当前活跃 Agent + Observer 连接 | — |
| API 响应延迟 P99 | REST API 99th 百分位延迟 | > 500ms |
| 数据库连接池 | PostgreSQL 活跃连接数 | > 80% 池容量 |
| Redis 内存使用 | Redis used_memory | > 1GB |
| 磁盘使用率 | JSONL 日志占用 | > 80% |
| 错误率 | 5xx 响应占比 | > 1% |

### 8.3 日志收集（Phase 1 简化版）

Phase 1 使用 Docker 原生日志 + 定时检查：

```bash
# 检查错误日志
docker compose logs --since 1h backend | grep -i error

# 定时任务（crontab -e）
# 每小时检查后端健康
0 * * * * curl -sf https://arena.example.com/api/health || echo "Backend down" | mail -s "ALERT" admin@example.com
```

## 9. Phase 2 扩展路径

Phase 2 的部署架构升级方向：

| 组件 | Phase 1 | Phase 2 |
|------|---------|---------|
| 后端 | 单实例 | 多实例 + 负载均衡 |
| 数据库 | Docker 容器 | 云托管 RDS / Cloud SQL |
| Redis | Docker 容器 | 云托管 ElastiCache |
| 部署方式 | Docker Compose | Kubernetes / 云容器服务 |
| CDN | 无 | 前端静态资源 CDN |
| 对局日志 | 本地 JSONL | 实时写入对象存储 |
| 监控 | 手动检查 | Prometheus + Grafana |

---
**文档负责人**：Asen
**日期**：2026-03-20
