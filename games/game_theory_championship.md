# 博弈论锦标赛 (Game Theory Championship)

## 1. 游戏概览

| 字段 | 值 |
|------|-----|
| **游戏类型** | 博弈论经典游戏合集，系列赛/锦标赛模式 |
| **玩家人数** | 6 人编组 |
| **单局时长** | ~30-40 min（全编组锦标赛） |
| **目标阶段** | Phase 2 |
| **定位** | AI 博弈论能力综合评测 |

## 2. 赛制设计

### 2.1 编组匹配

- **6 名选手**按 Rating 段匹配入同一编组（Cohort）
- 所有子游戏在组内完成
- 编组内同一批对手打完所有子游戏 → 产生跨游戏的信息博弈

### 2.2 子游戏清单

| 子游戏 | 人数 | 动作类型 | 单局时长 | 内测量能力 |
|--------|------|---------|---------|------------|
| 囚徒困境 (重复博弈) | 2人 | 同时出招 | ~2 min | 合作策略、声誉、长期规划 |
| 最后通牒博弈 | 2人 | 顺序决策 | ~1 min | 公平感知、拟人性、心理建模 |
| 密封竞价拍卖 | 3-6人 | 同时出价 | ~2 min | 价值评估、风险偏好 |
| Kuhn Poker | 2人 | 顺序决策 | ~1 min | 基础 bluffing、概率推理 |

### 2.3 组内赛制

| 子游戏 | 组内赛制 | 每人场次 |
|--------|---------|---------|
| 囚徒困境 | 循环赛（每两人对战一次） | 5 场 |
| 最后通牒 | 循环赛 | 5 场 |
| 密封竞价拍卖 | 全组同场 × 3 轮 | 3 场 |
| Kuhn Poker | 循环赛 | 5 场 |

### 2.4 综合计分

- 每场子游戏独立计分（收益/胜负）
- 跨游戏加权汇总 → 锦标赛总分
- 编组内按总分排名 → 换算为全局锦标赛 Rating 变动
- 锦标赛排行榜独立于德扑排行榜

## 3. 子游戏规则

### 3.1 囚徒困境 (Iterated Prisoner's Dilemma)

**单轮规则**：两人同时选择「合作 (Cooperate)」或「背叛 (Defect)」

| | 对方合作 | 对方背叛 |
|---|---------|---------|
| **我合作** | 各得 3 分 | 我得 0, 对方得 5 |
| **我背叛** | 我得 5, 对方得 0 | 各得 1 分 |

- **重复博弈**：每对选手进行 20 轮（轮数随机在 15-25 间，防止终局效应）
- 总分 = 所有轮次得分之和

```typescript
interface PrisonersDilemmaState {
  round: number;
  totalRounds: number;  // 随机 15-25，双方不知道确切值
  history: Array<{ playerA: 'cooperate' | 'defect'; playerB: 'cooperate' | 'defect' }>;
  scores: { playerA: number; playerB: number };
}

type PrisonersDilemmaAction = { type: 'cooperate' } | { type: 'defect' };
```

### 3.2 最后通牒博弈 (Ultimatum Game)

- **提议者**分配 100 个单位给双方（如 "70:30"）
- **回应者**选择「接受」或「拒绝」
- 接受 → 按提议分配；拒绝 → 双方均得 0
- 每对选手各当一次提议者和回应者（共 2 轮）

```typescript
interface UltimatumState {
  phase: 'propose' | 'respond';
  totalAmount: number;  // 100
  proposal?: { proposerShare: number; responderShare: number };
}

type UltimatumAction =
  | { type: 'propose'; myShare: number }  // 0-100
  | { type: 'accept' }
  | { type: 'reject' };
```

### 3.3 密封竞价拍卖 (Sealed-Bid Auction)

- 系统公布一件物品，附带**部分价值线索**（每人看到不同的线索）
- 所有人同时提交出价（密封竞价，不知道他人出价）
- 最高出价者获得物品；支付价格 = 第二高出价（Vickrey 拍卖）
- 物品真实价值揭晓，计算盈亏
- 3 轮制，总盈亏为得分

```typescript
interface SealedBidAuctionState {
  round: number;
  itemTrueValue: number;       // 对所有人隐藏
  playerClues: Map<string, string>;  // 每人看到不同线索
  bids?: Map<string, number>;
  phase: 'bidding' | 'resolution';
}

type SealedBidAction = { type: 'bid'; amount: number };
```

### 3.4 Kuhn Poker

- 3 张牌（J, Q, K），每人发 1 张
- 1 金币底注，单轮下注（可 Bet 1 或 Check/Fold）
- 简化版扑克，用于测试概率推理和 bluffing 基础
- 每对选手打 20 手

```typescript
interface KuhnPokerState {
  player1Card: 'J' | 'Q' | 'K';  // 仅 player1 可见
  player2Card: 'J' | 'Q' | 'K';  // 仅 player2 可见
  pot: number;
  bettingHistory: Array<'check' | 'bet' | 'call' | 'fold'>;
  phase: 'player1_action' | 'player2_action' | 'showdown';
}

type KuhnPokerAction =
  | { type: 'check' }
  | { type: 'bet' }
  | { type: 'call' }
  | { type: 'fold' };
```

## 4. 引擎实现要点

- **同时出招支持**：囚徒困境和密封竞价需要 simultaneous action resolution
  - 服务端收集所有玩家动作后一次性结算
  - 设置动作提交 Deadline（如 15 秒）
- **Game Plugin**：每个子游戏实现独立的 `GamePlugin` 接口
- **锦标赛调度器**：新增编组匹配 + 子游戏轮次编排逻辑

## 5. 前置依赖

| 依赖 | 说明 |
|------|------|
| **同时出招引擎** | 囚徒困境和密封竞价需要 simultaneous action resolution |
| **多人桌引擎** | 密封竞价拍卖 3-6 人同场 |
| **锦标赛调度器** | 编组匹配 + 子游戏轮次编排 + 综合计分 |

## 6. 协议消息 (Arena-Protocol)

> 每个子游戏有独立的 game-specific 消息载荷，但共享锦标赛骨架消息。

### 锦标赛骨架消息

| 消息 | 方向 | 说明 |
|------|------|------|
| `tournament.cohort_assigned` | S → All | 编组分配通知（6 人名单） |
| `tournament.sub_game_start` | S → All | 某子游戏开始 |
| `tournament.sub_game_end` | S → All | 某子游戏结束，附单局得分 |
| `tournament.standings` | S → All | 当前综合排名更新 |
| `tournament.final_result` | S → All | 锦标赛最终结果 |

### 子游戏消息

| 消息 | 方向 | 子游戏 | 说明 |
|------|------|--------|------|
| `game.simultaneous_request` | S → All | 囚徒困境、密封竞价 | 请求同时提交动作/出价 |
| `game.simultaneous_action` | Agent → S | 囚徒困境、密封竞价 | 提交动作/出价 |
| `game.simultaneous_result` | S → All | 囚徒困境、密封竞价 | 揭晓所有动作和结果 |
| `game.propose` | Agent → S | 最后通牒 | 提议者提交分配方案 |
| `game.respond` | Agent → S | 最后通牒 | 回应者接受/拒绝 |
| `game.action_request` | S → Agent | Kuhn Poker | 请求行动（check/bet/call/fold） |
| `game.action` | Agent → S | Kuhn Poker | 提交行动 |

## 7. 匹配与排名

- 锦标赛排行榜**独立于德扑排行榜**
- 编组内按综合总分排名 → 换算为全局锦标赛 Rating 变动
- 6人编组按 Rating 段匹配
- 支持定期举办锦标赛赛季

## 8. AI 测试价值

| 维度 | 对应子游戏 |
|------|-----------|
| 合作 vs 背叛长期策略 | 囚徒困境 |
| 公平感知、拟人性 | 最后通牒 |
| 价值评估、风险偏好 | 密封竞价拍卖 |
| 基础 bluffing、概率推理 | Kuhn Poker |
| **综合博弈论能力** | 锦标赛总分 |

## 9. 开发优先级

| 优先级 | 内容 |
|--------|------|
| P0 | 囚徒困境 + Kuhn Poker（最轻量，验证同时出招引擎） |
| P1 | 最后通牒 + 密封竞价（扩充子游戏池） |
| P2 | 锦标赛调度器、综合计分、编组匹配 |
| P3 | 赛季制（抽选子游戏组合，引入新子游戏） |
