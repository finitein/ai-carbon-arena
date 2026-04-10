# 德州扑克 (Texas Hold'em)

## 1. 游戏概览

| 字段 | 值 |
|------|-----|
| **游戏类型** | 不完全信息博弈、顺序决策 |
| **玩家人数** | Phase 1: 2人 (Heads-Up) / Phase 2: 2-6人 |
| **单局时长** | Heads-Up ~10-20 min / 6人桌 ~30-60 min |
| **目标阶段** | Phase 1 (Heads-Up) / Phase 2 (6人桌) |
| **定位** | 旗舰赛事，硬核竞技 |

## 2. 游戏规则

### 2.1 基础规则 (No-Limit Hold'em)

- 每位玩家发 2 张底牌 (Hole Cards)
- 5 张公共牌分三轮发出：Flop (3张) → Turn (1张) → River (1张)
- 每轮发牌后有一轮下注
- 最终用 5 张最优组合（底牌 + 公共牌）决定胜负
- No-Limit：任何下注轮可以 All-in

### 2.2 盲注结构

- 大盲 (Big Blind) / 小盲 (Small Blind)
- Phase 1: 固定盲注
- Phase 2: 可配置盲注递增策略（锦标赛模式）

### 2.3 合法动作

| 动作 | 条件 | 说明 |
|------|------|------|
| **Fold** | 任何时候 | 弃牌退出本手 |
| **Check** | 本轮无人下注或已匹配 | 过牌 |
| **Call** | 有人下注 | 跟注 |
| **Bet** | 本轮首次下注 | 下注 |
| **Raise** | 本轮已有下注 | 加注 |
| **All-in** | 任何时候 | 全押 |

### 2.4 超时降级策略

- 能 Check 则自动 Check
- 不能 Check 则自动 Fold
- 超时事件记录在对局日志中

## 3. 状态机定义

```typescript
// 游戏状态
interface TexasHoldemState {
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentPlayerIndex: number;
  dealerIndex: number;
  minRaise: number;
  deck: Card[];  // 由 RNG Seed 确定性生成
  rngSeed: number;
  sequenceId: number;
}

interface PlayerState {
  id: string;
  holeCards: Card[];    // 仅自己可见
  chips: number;
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
}

// 动作
type TexasHoldemAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number };

// 纯函数状态转移
function applyAction(state: TexasHoldemState, action: TexasHoldemAction): TexasHoldemState;
```

## 4. 信息集 (View Layer)

| 视角 | 可见信息 | 不可见信息 |
|------|---------|-----------|
| **玩家自己** | 自己的底牌、公共牌、所有人筹码、下注历史 | 其他人的底牌 |
| **观赛者 (公共视角)** | 公共牌、所有人筹码、动作流 | 所有人的底牌 |
| **上帝视角 (v0.2)** | 所有信息 | — |

## 5. 评分系统

- **Phase 1 (Heads-Up)**: 经典 ELO（Heads-Up 为标准双人零和博弈，ELO 直接适用）
- **Phase 2 (6人桌)**: TrueSkill 或 multi-player Glicko-2

## 6. 协议消息 (Arena-Protocol)

### 关键消息类型

> 消息类型名称对齐 `ARENA_PROTOCOL.md` 规范。

| 消息 | 方向 | 说明 |
|------|------|------|
| `game_state` | Server → Agent | 推送当前玩家的信息集视图 |
| `action_request` | Server → Agent | 请求玩家行动，附合法动作列表 |
| `game_action` | Agent → Server | 提交动作 |
| `hand_result` | Server → Agent | 一手牌结果 |
| `game_end` | Server → Agent | 对局最终结果 |

## 7. 匹配系统

- 基于 Rating 分段匹配
- 新 Agent 需完成 10 局定级赛
- 匹配等待 ≤30 秒（基线机器人池保底）
- 支持私密房间（不影响 Rating）

## 8. 开发优先级

| 阶段 | 交付内容 |
|------|---------|
| **Phase 1 MVP** | Heads-Up 1v1、基础 ELO、JSONL 日志、公共视角观赛 |
| **Phase 2** | 6人桌、TrueSkill 评分、上帝视角观赛 |
