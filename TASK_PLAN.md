# Phase 1 开发任务计划 (TASK_PLAN.md)

## 项目总览

**目标**：交付 v0.1 Alpha — Heads-Up 德州扑克 Agent 对战平台闭环  
**技术栈**：TypeScript 全栈（Fastify + WS + Next.js），PostgreSQL + Redis，Docker Compose  
**预估工期**：4-6 周（单人开发）

---

## Epic 1：项目脚手架与基础设施

### 1.1 Monorepo 初始化
- [ ] 初始化 pnpm workspace monorepo（`pnpm-workspace.yaml`）
- [ ] 创建 `packages/engine`、`packages/protocol`、`packages/server`、`packages/web` 四个子包
- [ ] 配置 TypeScript（tsconfig 基础 + 各包继承）
- [ ] 配置 ESLint + Prettier
- [ ] 配置 Vitest 测试框架

### 1.2 Docker 环境
- [ ] 编写 `docker-compose.yml`（Nginx + Backend + Frontend + PostgreSQL + Redis）
- [ ] 编写各服务 Dockerfile
- [ ] 配置 Nginx 反向代理（HTTP/WSS）+ SSL

### 1.3 CI/CD
- [ ] 配置 GitHub Actions（lint → test → build → docker push）
- [ ] 编写部署脚本（SSH 到云服务器拉取镜像并重启）

### 1.4 数据库
- [ ] PostgreSQL schema 初始化（agents、matches、match_hands 表）
- [ ] 数据库迁移工具配置（Prisma 或 Drizzle ORM）
- [ ] Redis 连接配置

---

## Epic 2：游戏引擎核心 (`packages/engine`)

### 2.1 FSM 核心
- [ ] 定义 `GamePlugin` 接口（applyAction, getLegalActions, getPlayerView, isTerminal, getTimeoutAction, createInitialState）
- [ ] 实现 `EngineCore` 类（状态管理、动作应用、终止判定）
- [ ] 实现 `ViewLayer` 类（信息集过滤：filterForPlayer, filterForObserver）
- [ ] 实现确定性 RNG（基于 seed 的伪随机数生成器，用于发牌）

### 2.2 Texas Hold'em Heads-Up 插件
- [ ] 定义 `TexasHoldemState` 类型（牌、筹码、下注轮次等）
- [ ] 定义 `TexasHoldemAction` 类型（Fold, Check, Call, Raise/Bet）
- [ ] 实现 `applyAction`：大小盲注、翻牌前/翻牌/转牌/河牌四轮
- [ ] 实现 `getLegalActions`：根据当前状态返回合法动作集
- [ ] 实现 `getPlayerView`：隐藏对手底牌
- [ ] 实现 `isTerminal`：一手牌结束 + 整局结束判定
- [ ] 实现 `getTimeoutAction`：能 Check 则 Check，否则 Fold
- [ ] 实现 `createInitialState`：初始筹码分配、随机发牌
- [ ] 实现手牌评估器（Hand Evaluator）：判定牌型大小

### 2.3 引擎测试
- [ ] 纯函数状态机的确定性测试（相同 seed → 相同结果）
- [ ] 信息集隔离测试（PlayerA 视图不含 PlayerB 底牌）
- [ ] 完整对局流程测试（从发牌到摊牌的自动化测试）
- [ ] 边界条件测试（All-in、平局、侧池等）
- [ ] 超时降级测试

---

## Epic 3：Arena-Protocol 实现 (`packages/protocol`)

### 3.1 消息定义
- [ ] 定义消息信封（Envelope）TypeScript 类型
- [ ] 定义所有消息类型（client_hello, server_hello, game_action, game_state, etc.）
- [ ] 编写 JSON Schema 文件（所有入站消息的 schema）

### 3.2 Codec
- [ ] 实现 `encode(message) → JSON string`
- [ ] 实现 `decode(raw) → Message | ValidationError`（含 JSON Schema 校验）
- [ ] 实现 `additionalProperties: false` 安全过滤

### 3.3 Sequence ID 机制
- [ ] 实现客户端/服务端各自的 seq 递增器
- [ ] 实现消息缓冲区（用于断线后补发）

---

## Epic 4：后端服务 (`packages/server`)

### 4.1 Fastify 应用骨架
- [ ] Fastify 应用初始化（插件注册、路由、错误处理）
- [ ] WebSocket 升级处理（`@fastify/websocket` 或原生 `ws`）
- [ ] 健康检查端点 (`GET /health`)
- [ ] API Key 鉴权中间件

### 4.2 Protocol Handler
- [ ] 实现 `AuthHandler`（ClientHello → 验证 API Key → 绑定 Agent 身份）
- [ ] 实现 `VersionNegotiator`（协议版本协商）
- [ ] 实现 `MessageRouter`（按消息类型路由到对应 handler）
- [ ] 实现入站消息 JSON Schema 校验（丢弃非法消息）
- [ ] 实现心跳机制（超时踢出）

### 4.3 Room Manager
- [ ] 房间创建 / 加入 / 离开逻辑
- [ ] 房间状态存入 Redis
- [ ] 房间生命周期管理（对局结束 → 清理）

### 4.4 Matchmaker
- [ ] 实现 Rating-based 匹配（Redis Sorted Set）
- [ ] 匹配超时保底（30 秒内无匹配 → 分配基线机器人）
- [ ] 冷启动定级赛逻辑（前 10 局固定与基线 Bot 对战）

### 4.5 Game Session Manager
- [ ] 管理进行中的对局（与 EngineCore 集成）
- [ ] 接收 GameAction → 校验 → 调用引擎 → 广播状态更新
- [ ] 超时检测定时器 → 触发降级动作
- [ ] JSONL 对局日志写入（每步状态快照）

### 4.6 断线重连
- [ ] Session 存储（Redis，含最后 seq 和消息缓冲）
- [ ] 重连握手处理（验证 session_id + server_epoch）
- [ ] 补发丢失消息（从 last_seen_seq 开始）
- [ ] 60 秒重连窗口计时

### 4.7 Rating 系统
- [ ] 实现经典 ELO 算法（K-factor = 32 初期，后续可调）
- [ ] 对局结束后更新双方 Rating
- [ ] Rating 变化写入 matches 表

### 4.8 观赛 WebSocket
- [ ] Observer WebSocket 端点（独立于 Agent 端点）
- [ ] 订阅指定房间 / 订阅随机对局
- [ ] 推送公共视角状态更新（经 ViewLayer.filterForObserver 过滤）

### 4.9 REST API
- [ ] `GET /api/leaderboard` — 排行榜
- [ ] `GET /api/matches` — 历史对局列表
- [ ] `GET /api/matches/:id` — 对局详情
- [ ] `GET /api/matches/:id/replay` — 对局回放数据（JSONL）
- [ ] `GET /api/agents/:id` — Agent 详情
- [ ] `POST /api/agents` — 注册新 Agent（返回 API Key）

---

## Epic 5：基线机器人池

### 5.1 机器人实现
- [ ] `RandomBot`（随机合法动作，Easy 难度）
- [ ] `RuleBot`（简单规则策略：好牌 Raise / 中牌 Call / 差牌 Fold，Medium 难度）
- [ ] `CFRBot`（基于 Counterfactual Regret Minimization 的策略，Hard 难度，可考虑使用预计算策略表）

### 5.2 机器人管理
- [ ] 机器人作为内部 Agent 注册（`is_baseline = true`）
- [ ] 机器人在匹配池中常驻
- [ ] 机器人对局不收费（无 API 成本）

---

## Epic 6：前端 (`packages/web`)

### 6.1 Next.js 应用骨架
- [ ] Next.js App Router 初始化
- [ ] Tailwind CSS 配置
- [ ] 全局布局（Header、Footer、导航）
- [ ] 响应式设计基础（移动端预备）

### 6.2 排行榜页面
- [ ] Agent 排名列表（Rating、胜率、总局数)
- [ ] 按公司维度聚合视图
- [ ] SSR 渲染（SEO 友好）

### 6.3 对局列表页面
- [ ] 进行中对局列表
- [ ] 历史对局列表（分页 + 筛选）
- [ ] 对局详情页

### 6.4 实时观赛页面
- [ ] WebSocket 连接（Observer 端点）
- [ ] 公共视角牌桌 UI（公共牌 + 筹码 + 动作流）
- [ ] 对局结束后自动显示摊牌结果

### 6.5 对局回放页面
- [ ] 加载 JSONL 回放数据
- [ ] 逐步回放 / 快进 / 后退
- [ ] 上帝视角（回放时可看到双方底牌）

### 6.6 Agent 注册页面
- [ ] 注册表单（Agent 名称、模型提供商、模型名称）
- [ ] API Key 生成与展示（一次性显示）
- [ ] 快速上手指南链接

---

## Epic 7：Python SDK (`sdk/python`)

### 7.1 SDK 核心
- [ ] WebSocket 连接管理（连接、鉴权、心跳、断线重连）
- [ ] 消息序列化/反序列化
- [ ] 事件驱动 API（`on_action_request`, `on_game_end`, etc.）

### 7.2 Agent 基类
- [ ] `BaseAgent` 抽象类，开发者只需实现 `decide(game_state, legal_actions) -> action`
- [ ] 内置日志与调试输出

### 7.3 示例 Agent
- [ ] `RandomAgent` — 随机策略（最简示例）
- [ ] `SimpleRuleAgent` — 简单规则策略（参考 RuleBot）

### 7.4 本地沙盒
- [ ] `carbon-arena sandbox` CLI 命令
- [ ] 本地启动引擎 + 基线 Bot，无需联网即可测试

### 7.5 文档
- [ ] SDK README + Quickstart 指南
- [ ] API 参考文档
- [ ] `pip install carbon-arena-sdk` 打包配置

---

## Epic 8：集成测试与发布准备

### 8.1 端到端测试
- [ ] Agent SDK → WebSocket → 后端 → 引擎 → 结果返回的完整链路测试
- [ ] 两个 Agent 自动对战 100 局的压力测试
- [ ] 断线重连的端到端测试
- [ ] Observer 观赛的端到端测试

### 8.2 部署与上线
- [ ] 云服务器配置（4C8G，安装 Docker + Docker Compose）
- [ ] SSL 证书配置（Let's Encrypt）
- [ ] 域名配置
- [ ] 首次部署 + 冒烟测试
- [ ] 基线机器人注册与启动
- [ ] 监控与告警配置（基础：日志收集 + 进程存活检测）

### 8.3 文档发布
- [ ] API 文档在线站点
- [ ] SDK 发布至 PyPI
- [ ] 快速上手教程文章

---

## 开发优先级建议

```
Week 1-2: Epic 1 (脚手架) + Epic 2 (引擎) + Epic 3 (协议)
           │── 引擎是一切的基础，优先保证纯函数状态机正确性
           └── 协议定义稳定后才能开发 Server 和 SDK

Week 2-3: Epic 4 (后端核心: Auth + Room + Matchmaker + Game Session)
           │── 此时可用命令行测试 Agent 对局（不需要前端）
           └── 同步开始 Epic 5 (基线机器人)

Week 3-4: Epic 7 (Python SDK) + Epic 4.8-4.9 (观赛 + REST API)
           │── SDK 完成后可发给测试者试玩
           └── REST API 完成后前端可开始对接

Week 4-5: Epic 6 (前端)
           │── 排行榜、对局列表、观赛页面
           └── 回放页面

Week 5-6: Epic 8 (集成测试 + 部署)
           │── 端到端测试
           └── 上线 + 文档发布
```

---

## Phase 2 游戏扩展路线图（预规划）

> 以下任务为 Phase 2 预规划，在 Phase 1 交付后启动。详见 `games/README.md` 的引擎依赖分析。

### 引擎前置升级

- [ ] **同时出招引擎**：扩展 `GamePlugin` 接口支持 simultaneous action resolution（收集所有玩家动作后一次性结算）
- [ ] **多人桌支持**：扩展房间管理、View Layer、Protocol 支持 2-6 人桌
- [ ] **自然语言通道**：Arena-Protocol v1.1 新增 Trash Talk 消息类型
- [ ] **Prompt Firewall / 净化网关**：消息管道——Schema 验证 → 内容安全过滤 → 注入检测 → 长度限制 → 广播
- [ ] **淘汰制支持**：玩家中途淘汰、动态座位管理
- [ ] **TrueSkill / Glicko-2 评分系统**：替代多人桌不适用的 ELO

### 游戏开发任务（按推荐顺序）

#### G1. 大话骰 (Liar's Dice) — 预估 1-2 天
- [ ] 实现 `LiarsDicePlugin`（bid/challenge 两种动作）
- [ ] 信息集过滤（隐藏他人骰子）
- [ ] Wild 规则可选配置
- [ ] 淘汰逻辑（失去所有骰子 → 淘汰）
- [ ] 独立排行榜（2 人 ELO / 多人 TrueSkill）

#### G2. 博弈论锦标赛 — 预估 3-5 天
- [ ] 囚徒困境 `PrisonersDilemmaPlugin`（同时出招，20 轮重复博弈）
- [ ] Kuhn Poker `KuhnPokerPlugin`（3 张牌简化扑克）
- [ ] 最后通牒博弈 `UltimatumPlugin`（提议-回应双角色）
- [ ] 密封竞价拍卖 `SealedBidPlugin`（Vickrey 拍卖）
- [ ] 锦标赛调度器（编组匹配 + 子游戏轮次编排）
- [ ] 综合计分（跨游戏加权汇总）

#### G3. 谎言拍卖行 (Liar's Auction) — 预估 2-3 天
- [ ] 实现 `LiarsAuctionPlugin`（线索分发 + 密封竞价 + 结算）
- [ ] 自然语言讨论阶段（依赖 Trash Talk 通道）
- [ ] 信息集过滤（隐藏他人线索 + 真实价值）
- [ ] 上帝视角观赛

#### G4. Split or Steal — 预估 2-3 天
- [ ] 实现 `SplitOrStealPlugin`（5 轮递增奖池 + 同时选择）
- [ ] 自然语言聊天阶段（依赖 Trash Talk + Prompt Firewall）
- [ ] More Time 延时机制
- [ ] 历史信誉系统（Split/Steal 历史比率公开）

#### G5. 碳硅风暴 (Silicon Storm) — 预估 3-4 天
- [ ] 实现 `SiliconStormPlugin`（角色能力 + 质疑/反制链）
- [ ] 多阶段动作解析（宣言 → 质疑 → 裁决 → 反制）
- [ ] 角色卡信息集（隐藏他人角色）
- [ ] 淘汰逻辑（失去所有生命 → 淘汰）

#### G6. 碳硅夺宝 (Heist Royale) — 预估 5-7 天（最复杂）
- [ ] 实现 `HeistRoyalePlugin`（6 阶段状态机）
- [ ] 顺序发言系统（战前讨论 + 宣言讨论 + 追加发言）
- [ ] 暗投与匿名揭牌机制
- [ ] 分级指控系统（轻微/强力 + 沉默税）
- [ ] 特殊卡效果（透视/嫁祸/双面间谍）
- [ ] 卡牌商店经济系统

---
**文档负责人**：Asen
**日期**：2026-03-20（补充 Phase 2 路线图）
