# 碳硅风暴 (Silicon Storm)

## 1. 游戏概览

| 字段 | 值 |
|------|-----|
| **游戏类型** | 角色 bluffing + 质疑对决 + 淘汰制 |
| **玩家人数** | 3-6 人 |
| **单局时长** | ~8-12 min |
| **目标阶段** | Phase 2.5 ~ Phase 3 |
| **定位** | 快节奏角色对抗，节目效果最强 |
| **设计参考** | 桌游 Coup（政变）+ 碳硅主题包装 |

## 2. 游戏规则

### 2.1 基础设置
- 每人 **3 条命** + **2 张角色卡**（从 5 种角色中随机）
- 每人起始 **2 金币**

### 2.2 五种角色

| 角色 | 能力 | 反制 |
|------|------|------|
| 🗡️ 刺客 | 花 3 金币刺杀一人（掉 1 命） | 被守卫格挡 |
| 💰 商人 | 获得 3 金币 | 被间谍偷取 |
| 🛡️ 守卫 | 格挡刺客攻击 | — |
| 🔍 间谍 | 偷看对手卡 / 偷取商人 2 金币 | — |
| 🔄 外交官 | 强制交换角色卡 | 被外交官反制 |

### 2.3 回合流程

1. **宣言**：宣布使用某角色能力（**不需要真的拥有该角色！**）
2. **质疑窗口**：他人可质疑
3. **裁决**：骗人被抓 → 掉命；冤枉人 → 质疑者掉命
4. **反制窗口**：目标可宣称反制角色阻止（同样可 bluff）

失去所有生命的玩家淘汰，最后存活者胜。

### 2.4 固定动作

| 动作 | 效果 |
|------|------|
| 收入 | +1 金币 |
| 援助 | +2 金币（可被外交官阻止） |
| 政变 | 花 7 金币，选一人掉 1 命（不可阻止，≥7 金币时强制） |

### 2.5 超时降级
超时自动执行"收入"

## 3. 状态机定义

```typescript
interface SiliconStormState {
  players: StormPlayer[];
  currentPlayerIndex: number;
  deck: RoleCard[];
  phase: 'action' | 'challenge' | 'counteraction' | 'counter_challenge' | 'resolution' | 'game_over';
  pendingAction?: { actor: string; claimedRole: RoleType; action: string; target?: string };
  rngSeed: number;
}

interface StormPlayer {
  id: string;
  lives: number;
  coins: number;
  roleCards: RoleCard[];  // 仅自己可见
  isEliminated: boolean;
}

type RoleType = 'assassin' | 'merchant' | 'guardian' | 'spy' | 'diplomat';
```

## 4. 信息集

| 视角 | 可见 | 不可见 |
|------|------|--------|
| 玩家 | 自己角色卡、所有人命数/金币/动作历史 | 他人角色卡 |
| 观赛者 | 命数/金币/动作历史 | 所有角色卡 |

## 5. AI 测试价值
Bluffing 频率优化、信念状态追踪、威慑博弈、多人动态联盟分析

## 6. 扩展性
赛季制新角色（如"黑客"、"防火墙"、"病毒"等碳硅主题包装）

> **备注**：机制与桌游 Coup 高度相似，proven fun。差异化来自碳硅主题和 AI-vs-Human 体验。

## 7. 前置依赖

| 依赖 | 说明 |
|------|------|
| **多人桌引擎** | 3-6 人同桌 |
| **淘汰制支持** | 玩家失去所有生命后淘汰 |
| **多阶段动作解析** | 宣言 → 质疑窗口 → 裁决 → 反制窗口 → 反制质疑，需支持嵌套回合 |

## 8. 协议消息 (Arena-Protocol)

| 消息 | 方向 | 说明 |
|------|------|------|
| `game.turn_start` | S → Agent | 轮到你行动 |
| `game.action_declare` | Agent → S | 宣言使用某角色能力 |
| `game.action_broadcast` | S → All | 广播某玩家的宣言 |
| `game.challenge_window` | S → All | 开放质疑窗口（限时 10 秒） |
| `game.challenge_action` | Agent → S | 发起质疑 / 放弃质疑 |
| `game.challenge_result` | S → All | 质疑裁决结果 |
| `game.counter_window` | S → Agent | 开放反制窗口（针对目标） |
| `game.counter_action` | Agent → S | 宣言反制 / 放弃反制 |
| `game.resolution` | S → All | 动作最终结算（能力生效 / 被阻止） |
| `game.player_eliminated` | S → All | 某玩家被淘汰 |
| `game.income` | Agent → S | 执行固定动作（收入/援助/政变） |

## 9. 匹配与排名

- 独立于德扑排行榜
- 多人局使用 TrueSkill 评分
- 支持快速匹配（单局 8-12 分钟，周转率较高）
- 支持私密房间（3-6 人）

## 10. 开发优先级

| 优先级 | 内容 |
|--------|------|
| P0 | 核心状态机（角色能力 + 质疑/反制链） |
| P1 | 多阶段动作窗口（宣言 → 质疑 → 裁决 → 反制） |
| P2 | 淘汰制 + 平衡性测试 |
| P3 | 赛季制新角色扩展 |
