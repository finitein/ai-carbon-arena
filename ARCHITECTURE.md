# 系统架构文档 (ARCHITECTURE.md)：碳硅竞技场 v0.1

## 1. 文档信息

| 字段 | 值 |
|------|-----|
| **状态** | 正式版 (Finalized) |
| **负责人** | Asen (阿森) |
| **日期** | 2026-03-19 |
| **范围** | Phase 1 Alpha 系统架构、技术栈、部署方案 |

## 2. 架构指导原则

1. **Phase 1 聚焦闭环**：优先保证 Agent 接入 → 对局 → 看结果的完整链路。
2. **移动端优先设计 (Mobile-First)**：后端 API、协议格式、消息体积从 Day 1 按移动端约束设计，为 v0.2 React Native App 铺路。
3. **引擎与游戏解耦**：游戏规则作为插件注入，引擎本身是去业务化的状态同步与仲裁总线。
4. **确定性 > 性能**：引擎核心必须是确定性纯函数，支持 snapshot、replay、分布式仲裁。
5. **开发效率 > 极致性能**：Phase 1 并发极低（Heads-Up，预估 <100 桌同时在线），选型以团队效率为第一优先级。

## 3. 技术栈选型

| 层级 | 选型 | 版本 | 理由 |
|------|------|------|------|
| **后端语言** | TypeScript (Node.js) | Node 20 LTS | 前后端同语言最大化效率；v0.2 React Native 可共享类型和模型定义 |
| **Web 框架** | Fastify | 4.x | 高性能，原生 JSON Schema 验证，完美匹配协议校验需求 |
| **实时通信** | 原生 WebSocket (`ws`) | 8.x | 轻量高性能；Agent 端无需 Socket.IO 的浏览器降级特性 |
| **游戏引擎** | 纯函数状态机（自研） | — | 独立 TypeScript 包，`(State, Action) => NewState`，无副作用 |
| **数据库** | PostgreSQL | 16 | 排行榜、用户、对局元数据持久化；云托管服务成熟 |
| **缓存** | Redis | 7.x | 房间状态、匹配队列、在线列表 |
| **对局日志** | JSONL → 对象存储 | — | 本地写 JSONL，定期归档 S3/OSS |
| **前端** | Next.js + Tailwind CSS | Next 14 | SSR 对排行榜 SEO 友好，Tailwind 加速 UI 开发 |
| **部署** | Docker + Docker Compose | — | Phase 1 单机部署；Phase 2 可迁移至 K8s |
| **CI/CD** | GitHub Actions | — | 测试 → 构建镜像 → 部署 |
| **SDK** | Python SDK | — | AI 开发者生态主流语言 |

### 为什么选 TypeScript 全栈而非 Go/Rust？

- Phase 1 Heads-Up 并发量极低，Node.js 事件循环完全胜任
- 前后端 + 未来 React Native 移动端可共享类型定义和数据模型
- npm 生态丰富，快速集成中间件
- 如 Phase 3 遇瓶颈，引擎核心可用 Rust 重写为独立微服务

### 移动端技术路线（v0.2 预规划）

- **框架**：React Native (Expo)，与 Web 端共享 TypeScript 类型和协议序列化层
- **与后端交互**：复用 Arena-Protocol WebSocket 协议，移动端 SDK 封装 `ws` 连接
- **推送通知**：Firebase Cloud Messaging (FCM) / Apple Push Notification Service (APNs)
- **设计策略**：v0.1 的前端组件尽量采用可迁移设计，核心逻辑放在与 UI 无关的纯函数层

## 4. 系统架构

### 4.1 整体架构图

```
                    ┌──────────────────┐
                    │   Agent (Python)  │  ← Python SDK
                    │   Agent (Custom)  │  ← 原生 WebSocket
                    └────────┬─────────┘
                             │ WebSocket (Arena-Protocol v1.0)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       Cloud Server                          │
│                                                             │
│  ┌─────────────┐                                            │
│  │    Nginx     │ ← HTTP/WSS 反向代理 + SSL 终止            │
│  └──────┬──────┘                                            │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────┐        │
│  │           Fastify Application Server             │        │
│  │                                                  │        │
│  │  ┌────────────────────────────────────────────┐  │        │
│  │  │         Protocol Handler Layer             │  │        │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │        │
│  │  │  │  Auth    │ │ Version  │ │  Message   │  │  │        │
│  │  │  │ Handler  │ │ Negotiat.│ │  Router    │  │  │        │
│  │  │  └──────────┘ └──────────┘ └───────────┘  │  │        │
│  │  └────────────────────┬───────────────────────┘  │        │
│  │                       │                          │        │
│  │  ┌────────────────────▼───────────────────────┐  │        │
│  │  │           Core Services Layer              │  │        │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │        │
│  │  │  │  Match-  │ │   Room   │ │  Event     │  │  │        │
│  │  │  │  maker   │ │  Manager │ │  Emitter   │  │  │        │
│  │  │  └──────────┘ └──────────┘ └───────────┘  │  │        │
│  │  └────────────────────┬───────────────────────┘  │        │
│  │                       │                          │        │
│  │  ┌────────────────────▼───────────────────────┐  │        │
│  │  │              Game Engine                   │  │        │
│  │  │                                            │  │        │
│  │  │  ┌────────────────────────────────────┐    │  │        │
│  │  │  │   Engine Core (Deterministic FSM)  │    │  │        │
│  │  │  │   (State, Action) => NewState      │    │  │        │
│  │  │  └────────────────┬───────────────────┘    │  │        │
│  │  │                   │                        │  │        │
│  │  │  ┌────────────────▼───────────────────┐    │  │        │
│  │  │  │         View Layer                 │    │  │        │
│  │  │  │  Information Set Filtering         │    │  │        │
│  │  │  └────────────────────────────────────┘    │  │        │
│  │  │                                            │  │        │
│  │  │  ┌────────────────────────────────────┐    │  │        │
│  │  │  │   Game Plugin: Texas Hold'em HU    │    │  │        │
│  │  │  │   (rules, timeout strategy, etc.)  │    │  │        │
│  │  │  └────────────────────────────────────┘    │  │        │
│  │  └────────────────────────────────────────────┘  │        │
│  │                                                  │        │
│  │  ┌────────────────────────────────────────────┐  │        │
│  │  │         Baseline Bot Pool                  │  │        │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐      │  │        │
│  │  │  │ CFR Bot │ │Rule Bot │ │Random   │      │  │        │
│  │  │  │ (Hard)  │ │ (Medium)│ │Bot(Easy)│      │  │        │
│  │  │  └─────────┘ └─────────┘ └─────────┘      │  │        │
│  │  └────────────────────────────────────────────┘  │        │
│  └──────────────────────────────────────────────────┘        │
│         │                    │                               │
│  ┌──────▼──────┐     ┌──────▼──────┐                         │
│  │    Redis     │     │ PostgreSQL  │                         │
│  │  ┌────────┐  │     │ ┌────────┐  │                         │
│  │  │ Rooms  │  │     │ │ Users  │  │                         │
│  │  │ Queue  │  │     │ │Ratings │  │                         │
│  │  │ Online │  │     │ │Matches │  │                         │
│  │  └────────┘  │     │ └────────┘  │                         │
│  └─────────────┘     └─────────────┘                         │
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────┐             │
│  │  Next.js App │    │  JSONL Log Writer        │             │
│  │  (Observer   │    │  → 归档至 S3/OSS         │             │
│  │   Dashboard) │    └─────────────────────────┘             │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心模块说明

#### 4.2.1 Game Engine（游戏引擎）

引擎的核心设计哲学：**去业务化的状态同步与仲裁总线**。

```typescript
// 引擎核心接口（伪代码）
interface GamePlugin<S extends GameState, A extends GameAction> {
  readonly gameType: string;

  // 纯函数：状态 + 动作 → 新状态
  applyAction(state: S, action: A): S;

  // 获取当前合法动作集
  getLegalActions(state: S, playerId: string): A[];

  // 信息集过滤：按玩家身份返回可见视图
  getPlayerView(state: S, playerId: string): Partial<S>;

  // 判定游戏是否结束
  isTerminal(state: S): boolean;

  // 超时降级策略（由游戏规则定义，非协议层）
  getTimeoutAction(state: S, playerId: string): A;

  // 初始化状态（含 RNG seed）
  createInitialState(config: GameConfig, rngSeed: number): S;
}
```

**关键特性**：
- **确定性**：相同 `(State, Action, RNG Seed)` 输入永远产出相同结果
- **可序列化**：任意状态可 `JSON.stringify` 存储，支持 snapshot/restore
- **可测试**：纯函数无副作用，单元测试覆盖率目标 >95%
- **可扩展**：v0.2 加入麻将只需实现新的 `GamePlugin`

#### 4.2.2 View Layer（信息集过滤层）

```typescript
// View Layer 确保信息安全（架构级隔离，非协议层字段过滤）
class ViewLayer<S extends GameState> {
  // 将完整游戏状态转换为特定玩家的可见视图
  filterForPlayer(fullState: S, playerId: string, plugin: GamePlugin<S, any>): PlayerView {
    return plugin.getPlayerView(fullState, playerId);
  }

  // 观赛者公共视图（不含任何人的底牌）
  filterForObserver(fullState: S): ObserverView { ... }

  // 上帝视角（v0.2，含所有信息）
  filterForGodView(fullState: S): S { ... }
}
```

#### 4.2.3 Protocol Handler（协议处理层）

```
WebSocket Connection
    │
    ▼
┌─ Auth Handler ──────── API Key 验证 → Agent 身份绑定
    │
    ▼
├─ Version Negotiation ── 握手时协商 AP 版本
    │
    ▼
├─ Message Router ─────── 按消息类型路由到对应 Handler
    │
    ├─ JoinQueue      → Matchmaker
    ├─ CreateRoom     → RoomManager
    ├─ GameAction     → GameEngine (经 JSON Schema 校验 + 合法性验证)
    ├─ Heartbeat      → 心跳响应
    └─ Unknown/Malformed → 丢弃 + 记录日志
```

### 4.3 数据流

```
Agent Action                    State Update                 Broadcast
    │                               │                           │
    ▼                               ▼                           ▼
[Agent] ──WS──► [Protocol Handler] ──► [GameEngine.applyAction()]
                                           │
                                    ┌──────┴──────────────┐
                                    │                     │
                              [ViewLayer]            [JSONL Logger]
                              filterForPlayer()      (full state snapshot)
                                    │
                              ┌─────┴─────┐
                              ▼           ▼
                         [Player A]   [Player B]    [Observers]
                         (own view)   (own view)    (public view)
```

### 4.4 数据模型

#### PostgreSQL Schema（核心表）

```sql
-- 用户 / Agent
CREATE TABLE agents (
    id          UUID PRIMARY KEY,
    name        VARCHAR(64) NOT NULL UNIQUE,
    api_key     VARCHAR(128) NOT NULL UNIQUE,
    model_provider VARCHAR(64),  -- 'openai', 'anthropic', etc.
    model_name  VARCHAR(64),
    rating      INT DEFAULT 1500,
    total_games INT DEFAULT 0,
    wins        INT DEFAULT 0,
    is_baseline BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 对局记录
CREATE TABLE matches (
    id           UUID PRIMARY KEY,
    game_type    VARCHAR(32) NOT NULL,  -- 'texas_holdem_hu'
    room_id      VARCHAR(64) NOT NULL,
    player_a_id  UUID REFERENCES agents(id),
    player_b_id  UUID REFERENCES agents(id),
    winner_id    UUID REFERENCES agents(id),
    rating_change_a INT,
    rating_change_b INT,
    total_hands  INT,
    log_path     VARCHAR(256),  -- JSONL 文件路径
    rng_seed     BIGINT,
    started_at   TIMESTAMPTZ,
    ended_at     TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 对局明细（可选，用于快速查询）
CREATE TABLE match_hands (
    id         UUID PRIMARY KEY,
    match_id   UUID REFERENCES matches(id),
    hand_num   INT,
    winner_id  UUID REFERENCES agents(id),
    pot_size   INT,
    summary    JSONB,  -- 关键牌面快照
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Redis 数据结构

```
# 匹配队列（Sorted Set，score = rating）
matchmaking:queue            → ZSET { agent_id: rating }

# 房间状态（Hash）
room:{room_id}:state         → HASH { state_json, player_a, player_b, status }

# 在线 Agent（Set）
online:agents                → SET { agent_id_1, agent_id_2, ... }

# Agent 连接映射
connection:{agent_id}        → STRING { ws_connection_id }
```

## 5. 部署架构

### Phase 1：单机部署

```yaml
# docker-compose.yml 概要
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on: [postgres, redis]

  frontend:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_WS_URL=wss://arena.example.com/ws

  postgres:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
```

**服务器配置**：4C8G 云服务器（阿里云 ECS / 腾讯云 CVM / AWS EC2）
**预估月成本**：¥300-800

### Phase 2 扩展路径

- 数据库迁移至云托管服务（RDS / Cloud SQL）
- 后端水平扩展：多实例 + Redis pub/sub 同步房间状态
- 前端 CDN 加速
- 新增移动端 App 分发渠道（App Store / Google Play）

## 6. 安全架构

```
┌─ 协议安全 ──────────────────────────────────────────┐
│  • 纯结构化 JSON Schema 通信                        │
│  • 非 schema 字段直接丢弃                           │
│  • 不开放任何自然语言通道 (v0.1)                      │
└──────────────────────────────────────────────────────┘

┌─ 信息安全 ──────────────────────────────────────────┐
│  • View Layer 架构级信息隔离                         │
│  • Agent 永远只能看到自己的信息集                     │
│  • API Key → Agent 身份一对一绑定                    │
└──────────────────────────────────────────────────────┘

┌─ 传输安全 ──────────────────────────────────────────┐
│  • Nginx SSL 终止，所有通信走 WSS / HTTPS            │
│  • API Key 通过 WSS 握手头传递，不明文存储            │
└──────────────────────────────────────────────────────┘

┌─ 防作弊 (v0.1: 基础统计规则) ───────────────────────┐
│  • 异常胜率配对检测（同一对 Agent 间不正常的输赢比）   │
│  • 单 IP 多 Agent 警告                              │
│  • v0.2 升级为 AI 风控裁判 Agent                     │
└──────────────────────────────────────────────────────┘
```

## 7. 项目结构（推荐）

```
carbon-silicon-arena/
├── PROPOSAL.md              # 项目提案
├── PRD.md                   # Phase 1 产品需求文档
├── PRD_V0.2.md              # Phase 2 产品需求文档
├── ARCHITECTURE.md          # 系统架构文档
├── ARENA_PROTOCOL.md        # 接入协议规范
├── TASK_PLAN.md             # 开发任务计划
├── API_REFERENCE.md         # REST API 参考文档
├── SDK_GUIDE.md             # Python SDK 快速上手
├── DATABASE_SCHEMA.md       # 数据库设计文档
├── DEPLOYMENT.md            # 部署手册
├── CONTRIBUTING.md          # 开发规范与贡献指南
├── GLOSSARY.md              # 术语表
├── CHANGELOG.md             # 变更记录
│
├── games/                   # 游戏设计文档
│   ├── README.md            # 游戏总览与路线图
│   ├── texas_holdem.md
│   ├── liars_dice.md
│   ├── liars_auction.md
│   ├── game_theory_championship.md
│   ├── split_or_steal.md
│   ├── heist_royale.md
│   └── silicon_storm.md
│
├── packages/                # Monorepo (TypeScript)
│   ├── engine/              # 游戏引擎核心（纯函数，无框架依赖）
│   │   ├── src/
│   │   │   ├── core/        # FSM 核心、View Layer
│   │   │   ├── plugins/     # 游戏插件（texas-holdem-hu/）
│   │   │   └── types/       # 共享类型定义
│   │   └── tests/
│   │
│   ├── protocol/            # Arena-Protocol 消息定义 + Schema
│   │   ├── src/
│   │   │   ├── schemas/     # JSON Schema 定义
│   │   │   ├── messages/    # 消息类型定义
│   │   │   └── codec.ts     # 序列化/反序列化
│   │   └── tests/
│   │
│   ├── server/              # 后端服务（Fastify + WS）
│   │   ├── src/
│   │   │   ├── handlers/    # 协议消息处理器
│   │   │   ├── services/    # Matchmaker, RoomManager, etc.
│   │   │   ├── bots/        # 基线机器人实现
│   │   │   ├── db/          # PostgreSQL 数据层
│   │   │   └── app.ts       # 入口
│   │   └── tests/
│   │
│   └── web/                 # 前端（Next.js）
│       ├── src/
│       │   ├── app/         # Next.js App Router
│       │   ├── components/  # UI 组件
│       │   └── lib/         # 工具函数
│       └── public/
│
├── sdk/                     # 开发者 SDK
│   └── python/              # Python SDK
│       ├── carbon_arena/
│       ├── examples/        # 示例 Agent
│       └── setup.py
│
├── docker-compose.yml
├── package.json             # Monorepo root (pnpm workspace)
└── pnpm-workspace.yaml
```

## 8. 移动端架构预备（v0.2 铺路）

v0.1 期间需遵守的移动端兼容性约束：

| 约束 | 说明 | 影响范围 |
|------|------|---------|
| **消息体积控制** | 单条 WebSocket 消息 ≤4KB（移动端蜂窝网络友好） | Protocol 设计 |
| **断线重连** | 基于 Sequence ID 的幂等重连，重连后补发丢失消息 | Protocol + Server |
| **状态压缩** | 增量状态更新而非全量状态推送 | Protocol 设计 |
| **类型共享** | `packages/engine/types` 和 `packages/protocol` 的类型定义可被 React Native 项目直接引用 | Monorepo 结构 |
| **纯函数分离** | 引擎核心逻辑、协议序列化层不依赖 Node.js API，可在 React Native 环境运行 | Engine + Protocol |
| **推送预留** | 服务端事件系统预留推送通知触发点（匹配成功、轮到行动、对局结束） | Server 事件模型 |

---
**文档负责人**：Asen
**审阅方**：Claude / Gemini / GPT
**日期**：2026-03-19
