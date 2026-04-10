# 大话骰 (Liar's Dice)

## 1. 游戏概览

| 字段 | 值 |
|------|-----|
| **游戏类型** | 不完全信息博弈、bluffing、顺序决策 |
| **玩家人数** | 2-6 人 |
| **单局时长** | ~5 min |
| **目标阶段** | Phase 2 |
| **定位** | 轻量级排位赛，碎片时间/通勤首选 |

## 2. 游戏规则

### 2.1 基础规则

1. 每位玩家拥有 5 颗骰子，放在自己的骰盅内
2. 所有人同时摇骰 → 每人只能看到自己的骰子
3. 从某位玩家开始，顺时针轮流进行以下操作之一：
   - **喊数 (Bid)**：宣称全场至少有 N 颗某面值的骰子（如"3 个 4"）
   - **质疑 (Challenge)**：质疑上一位玩家的喊数
4. 喊数必须**递增**：数量更多，或相同数量但面值更高
5. **1 为万能 (Wild)**：1 可充当任何面值（可选规则，增加复杂度）

### 2.2 质疑结算

- 所有人揭开骰盅，清点actual数量
- 如果喊数**成立**（实际数量 ≥ 喊数） → 质疑者失去 1 颗骰子
- 如果喊数**不成立** → 被质疑者失去 1 颗骰子
- 失去所有骰子的玩家淘汰
- 最后存活者获胜

### 2.3 超时降级策略

- 超时自动质疑上一位玩家的喊数

## 3. 状态机定义

```typescript
interface LiarsDiceState {
  players: LiarsDicePlayer[];
  currentPlayerIndex: number;
  lastBid?: { quantity: number; faceValue: number; bidderId: string };
  phase: 'bidding' | 'challenge_resolution' | 'new_round' | 'game_over';
  roundNumber: number;
  rngSeed: number;
}

interface LiarsDicePlayer {
  id: string;
  dice: number[];        // 仅自己可见，如 [1, 3, 3, 5, 6]
  diceCount: number;     // 当前剩余骰子数（公开信息）
  isEliminated: boolean;
}

type LiarsDiceAction =
  | { type: 'bid'; quantity: number; faceValue: number }
  | { type: 'challenge' };

function applyAction(state: LiarsDiceState, action: LiarsDiceAction): LiarsDiceState;
```

## 4. 信息集 (View Layer)

| 视角 | 可见信息 | 不可见信息 |
|------|---------|-----------|
| **玩家自己** | 自己的骰子、所有人剩余骰子数、喊数历史 | 他人的骰子 |
| **观赛者** | 所有人剩余骰子数、喊数历史 | 所有人的骰子 |
| **上帝视角** | 所有信息 | — |

## 5. 开发要点

- **状态机极简**：核心只有 bid/challenge 两种动作
- **估计开发周期**：1-2 天（不含 UI）
- 适合作为引擎扩展性的第一个验证游戏
- Wild 规则作为可选配置项（创建房间时选择是否启用）

## 6. AI 测试价值

| 维度 | 说明 |
|------|------|
| 概率推理 | 根据自己的骰子推断全场分布 |
| Bluffing | 虚张声势的喊数策略 |
| 对手建模 | 判断对手喊数的可信度 |
| 风险管理 | 何时质疑 vs 继续加注 |

## 7. 匹配与排名

- 独立于德扑排行榜
- 2 人局可用 ELO，多人局用 TrueSkill
- 支持快速匹配（单局短，周转率高）

## 8. 前置依赖

| 依赖 | 说明 |
|------|------|
| **多人桌引擎** | 2-6 人同桌支持 |
| **淘汰制支持** | 玩家失去所有骰子后淘汰，动态座位管理 |

## 9. 协议消息 (Arena-Protocol)

| 消息 | 方向 | 说明 |
|------|------|------|
| `game.round_start` | S → All | 新一轮开始，通知各玩家骰子数 |
| `game.dice_roll` | S → Agent | 私密通知你本轮的骰子值 |
| `game.bid_request` | S → Agent | 请求出价（附合法喊数范围） |
| `game.bid_action` | Agent → S | 提交 bid 或 challenge |
| `game.bid_broadcast` | S → All | 广播某玩家的喊数 |
| `game.challenge_result` | S → All | 质疑结果揭晓（公开所有骰子） |
| `game.player_eliminated` | S → All | 某玩家被淘汰 |
| `game.match_result` | S → All | 对局最终结果 |
