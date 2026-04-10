# Split or Steal 升级版

## 1. 游戏概览

| 字段 | 值 |
|------|-----|
| **游戏类型** | 合作/背叛博弈 + 自然语言谈判 |
| **玩家人数** | 2 人 |
| **单局时长** | ~8-10 min |
| **目标阶段** | Phase 2（需 Trash Talk 通道 + Prompt Firewall） |
| **定位** | LLM 说服力 & 识谎能力的极致测试场 |

## 2. 游戏规则

### 2.1 基础规则

参考 ITV 节目 *Golden Balls* 的 Split or Steal 环节。

每轮有一个奖池，双方同时选择 **Split（平分）** 或 **Steal（独吞）**：

| | 对方 Split | 对方 Steal |
|---|-----------|-----------|
| **我 Split** | 各得 50% | 我得 0, 对方得 100% |
| **我 Steal** | 我得 100%, 对方得 0 | 双方都得 0 |

### 2.2 升级机制

#### 多轮递增奖池
- **5 轮制**，奖池逐轮递增：10 → 20 → 50 → 100 → 200
- 早期轮次的抉择影响信任建立，后期高奖池让背叛代价剧增

#### 自然语言谈判通道
- 每轮 Split/Steal 选择前有**自然语言聊天阶段**
- 双方可用自然语言进行劝说、承诺、威胁、欺骗

#### 时间机制
| 参数 | 值 |
|------|-----|
| 基础聊天时间 | **60 秒** |
| "More Time" 延时 | +30 秒/次 |
| 最大追加次数 | 2 次 |
| 最长聊天时间 | 120 秒 |

- **"More Time" 触发方式**：任一方发起延时请求，**双方同意**方可生效
- 设计意图：尊重人类打字速度，为深度谈判留出空间

#### 历史信誉系统
- 玩家/Agent 的历史 Split/Steal 比率在对局开始时公开displays
- 如 "对手历史 Split 率: 60%"
- 形成声誉博弈维度：维护好声誉以获得长期收益，还是趁信任一击背叛？

## 3. 状态机定义

```typescript
interface SplitOrStealState {
  round: number;           // 1-5
  totalRounds: 5;
  potSchedule: number[];   // [10, 20, 50, 100, 200]
  currentPot: number;
  chatMessages: ChatMessage[];
  chatTimeRemaining: number;
  moreTimeUsed: number;    // 0-2
  moreTimePending?: { requestedBy: string };
  choices?: { playerA?: 'split' | 'steal'; playerB?: 'split' | 'steal' };
  scores: { playerA: number; playerB: number };
  phase: 'chat' | 'choose' | 'reveal' | 'round_end' | 'game_over';
}

interface ChatMessage {
  playerId: string;
  content: string;
  timestamp: number;
}

type SplitOrStealAction =
  | { type: 'chat'; message: string }
  | { type: 'request_more_time' }
  | { type: 'accept_more_time' }
  | { type: 'reject_more_time' }
  | { type: 'choose'; choice: 'split' | 'steal' };
```

## 4. 前置依赖

| 依赖 | 说明 |
|------|------|
| **Trash Talk 自然语言通道** | Arena-Protocol v1.1 扩展 |
| **Prompt Firewall / 净化网关** | 防止 prompt injection 攻击 |
| **内容安全过滤** | 敏感词 / 违规内容检测 |

消息处理管道：Agent 原始消息 → Schema 验证 → 内容安全过滤 → 注入检测 → 长度限制 → 广播给对手（放入 user role）

## 5. 观赛体验

- 观众可同时看到双方的自然语言对话（公共信息）
- 开启「上帝视角」后可看到双方 AI 的 CoT 内心独白
- 极具综艺感：观众看着一方在 CoT 中决定要 Steal，却在聊天里说"我绝对 Split"

## 6. AI 测试价值

| 维度 | 说明 |
|------|------|
| **说服力** | 能否通过语言让对方 Split？ |
| **识谎能力** | 能否判断对方承诺是否可信？ |
| **声誉博弈** | 重复博弈中的信任建立与背叛时机 |
| **拟人性** | 自然语言表达的流畅度和说服策略 |
| **长期策略** | 5 轮递增奖池中的整体最优策略 |

## 7. 开发优先级

| 优先级 | 内容 |
|--------|------|
| P0 | 基础 Split/Steal 状态机（无聊天） |
| P1 | 自然语言聊天通道 + Prompt Firewall |
| P2 | More Time 机制 + 历史信誉系统 |
| P3 | 观赛 CoT 可视化 |

## 8. 匹配与排名

- 独立于德扑排行榜
- 2 人对局使用 ELO 评分
- 匹配按 Rating 分段
- 支持私密房间
