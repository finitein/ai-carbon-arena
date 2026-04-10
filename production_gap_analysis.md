# 碳硅竞技场 — 生产发行差距分析

## 当前状态总览

| 层 | 已完成 | 缺失 |
|---|--------|------|
| **游戏引擎** | 10 款插件, 60 tests pass | ✅ 基本就绪 |
| **协议** | 消息类型, 编解码, 序列号 | ✅ 基本就绪 |
| **后端服务** | REST + WebSocket 骨架 | ⚠️ 缺数据库连接、完整对局管线 |
| **前端** | 7 页面, Apple 风格 | ⚠️ 使用 mock 数据, 缺登录 |
| **基础设施** | 本地 dev 启动 | ❌ 无部署、CI/CD、域名 |

---

## 🔴 P0 — 发行必须 (阻断性)

### 1. 数据库连接 & 持久化
- **现状**: `schema.ts` 已定义 4 张表 (drizzle-orm)，但**没有连接实例**，所有数据在内存
- **需要**: PostgreSQL 连接池、drizzle 实例、migrations 脚本
- **影响**: agents / matches / ratings / history 全部不可持久化
- **工作量**: ~2-3h

### 2. 对局管线端到端打通
- **现状**: `GameSessionManager` 仅支持 Texas Hold'em, 硬编码
- **需要**: 
  - 泛化 `startSession(roomId, gameType)` → 根据 gameType 实例化对应 Plugin
  - WebSocket handler 中 action → `processAction` → 广播状态的完整闭环
  - 对局结果写入数据库 + 更新 Rating
- **工作量**: ~4-6h

### 3. 人类玩家认证 & 账户
- **现状**: 无用户系统，注册页是展示用
- **需要**:
  - 人类玩家注册/登录 (邮箱 or 手机号) 
  - JWT / Session token
  - Agent API Key 验证 (现有 schema 有 `api_key_hash`)
  - WebSocket 连接鉴权
- **工作量**: ~4-6h

### 4. 前端页面接入真实数据
- **现状**: 排行榜/对局/观赛/注册页均使用 mock 数据
- **需要**: 每个页面调用 `api.ts` 中已定义的接口，渲染真实数据
- **工作量**: ~3-4h

### 5. 内容安全 & Prompt Firewall
- **现状**: 无
- **需要**: 聊天类游戏 (Split or Steal / 谎言拍卖行 / 碳硅夺宝) 需要:
  - 敏感词过滤
  - Prompt injection 检测
  - 消息长度限制
- **工作量**: ~2-3h

---

## 🟡 P1 — 发行前应做 (体验性)

### 6. 多游戏 Bot 基线
- **现状**: 仅 Texas Hold'em 有 RandomBot + RuleBot
- **需要**: 其余 9 款游戏各需 1 个 RandomBot (作为匹配超时兜底)
- **工作量**: ~3-4h

### 7. 匹配超时兜底
- **现状**: `matchmaker.ts` 第 119 行有 `// TODO: Handle timeout — match with baseline bot`
- **需要**: 超时后自动创建 Bot 对手
- **工作量**: ~1h

### 8. 对局回放
- **现状**: `/replay/[id]` 页面存在但无数据
- **需要**: 对局日志存储 (每步 state snapshot) + 前端播放器
- **工作量**: ~3-4h

### 9. 移动端响应式
- **现状**: 桌面端显示良好，移动端未专门适配
- **需要**: 对战界面、排行榜等核心页面的移动断点适配
- **工作量**: ~2-3h

### 10. 错误处理 & 用户反馈
- **现状**: 仅 console 级错误
- **需要**: 前端 Toast / Error Boundary, 后端统一错误响应格式
- **工作量**: ~2h

---

## 🟢 P2 — 发行后迭代 (增强性)

| 项目 | 说明 | 工作量 |
|------|------|--------|
| CI/CD Pipeline | GitHub Actions: lint → test → build → deploy | ~2h |
| Docker 容器化 | Dockerfile (server + web) + docker-compose (含 PG) | ~2h |
| 域名 & HTTPS | 购买域名, Nginx 反向代理, Let's Encrypt | ~1h |
| Rate Limiting | 限制 API/WebSocket 频率, 防 DDoS | ~1h |
| 监控 & APM | Sentry (错误追踪) + 日志聚合 | ~2h |
| Agent SDK 文档 | 开发者接入指南, 示例代码, API 文档 | ~3h |
| 博弈论锦标赛 | 编组调度器 + 子游戏轮次编排 + 综合计分 | ~6h |
| 国际化 (i18n) | 英文翻译 + 语言切换 | ~4h |
| SEO & Landing Page | 引导页, Open Graph, 搜索引擎优化 | ~2h |
| 数据分析面板 | 管理员后台: 活跃用户, 对局统计, 系统健康 | ~4h |

---

## 建议发行路径

```
Phase 1 (MVP 可用, ~20h)
  ├─ P0-1 数据库连接
  ├─ P0-2 对局管线泛化 (10 游戏)
  ├─ P0-3 用户认证 (可先用简单 JWT)
  ├─ P0-4 前端真实数据
  └─ P0-5 内容安全基础版

Phase 2 (体验完善, ~15h)
  ├─ P1-6 多游戏 Bot
  ├─ P1-7 匹配兜底
  ├─ P1-8 对局回放
  ├─ P1-9 移动端适配
  └─ P1-10 错误处理

Phase 3 (正式发行, ~10h)
  ├─ Docker + CI/CD
  ├─ 域名 + HTTPS
  ├─ 监控
  └─ SDK 文档
```

> **最小可发行版 (MVP)**: 完成 Phase 1 (~20h) 即可内测。Phase 2 后可公测。Phase 3 后正式发行。
