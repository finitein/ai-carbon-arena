// ============================================================
// LLM Bot Service — AI players using DashScope API
// OpenAI-compatible endpoint with 4 models
// ============================================================

import { getPluginFactory } from '../services/plugin-registry';

const API_URL = 'https://coding.dashscope.aliyuncs.com/v1/chat/completions';
const API_KEY = 'sk-sp-adf947f1f9b34736b36a0162372baf36';

export const LLM_MODELS = [
  'qwen3.5-plus',
  'kimi-k2.5',
  'MiniMax-M2.5',
  'glm-5',
] as const;

export type LLMModel = typeof LLM_MODELS[number];

/** Pick a random model from the 4 available */
export function randomModel(): LLMModel {
  return LLM_MODELS[Math.floor(Math.random() * LLM_MODELS.length)];
}

// ============================================================
// Game rules prompts for each game type
// ============================================================

function getGameRulesPrompt(gameType: string): string {
  switch (gameType) {
    case 'heist_royale':
      return `你正在玩《碳硅夺宝》(Heist Royale) — 一个 6 人合作/背叛博弈游戏。

## 游戏规则
- 6 人，5 轮制，每人起始 50 金币 + 3 张手牌
- 手牌：战力卡(+1到+5) 和 破坏卡(-3)
- 每轮目标：所有人暗投的卡牌总战力 ≥ 任务要求

## 每轮流程
1. **战前讨论**(pre_discuss) — 顺序发言，承诺/商议策略
2. **暗投**(commit) — 从手牌出 1 张卡（战力卡或破坏卡）
3. **宣言讨论**(declare) — 宣称自己出了什么（可说谎）
4. **指控**(accuse) — 可指控某玩家出了破坏卡，或选择沉默
5. **揭牌**(reveal) — 公开所有卡牌组合（但不公开谁出了哪张）

## 指控规则
- 轻微指控: 花 5 金 → 正确得 10 金(净赚5)，错误失 8 金(净亏3)
- 强力指控: 花 15 金 → 正确得 30 金(净赚15)，错误失 23 金(净亏8)
- 沉默: 失 2 金（沉默税）

## 操作格式
- 讨论阶段: {"type":"speak","message":"你的发言"} 或 {"type":"end_discussion"}
- 暗投: {"type":"commit_card","cardIndex":0} (0-based索引选择手牌)
- 宣言: {"type":"declare","claim":"我出了+3战力卡"}
- 指控: {"type":"accuse","target":"对手ID","tier":"light"或"heavy"}
- 沉默: {"type":"silence"}`;

    case 'texas_holdem_hu':
      return `你正在玩 HU 德州扑克（Heads-Up Texas Hold'em）。
- 2 人对决，起始各 10000 筹码，小盲 50，大盲 100
- 每手牌：发 2 张底牌 → 翻牌(3张) → 转牌(1张) → 河牌(1张)

## 操作格式
- {"type":"fold"} 弃牌
- {"type":"check"} 过牌
- {"type":"call"} 跟注
- {"type":"bet","amount":数字} 下注
- {"type":"raise","amount":数字} 加注`;

    case 'kuhn_poker':
      return `你正在玩 Kuhn Poker — 极简 3 张牌扑克。
- 只有 J, Q, K 三张牌，每人发 1 张，K > Q > J

## 操作格式
- {"type":"check"} 过牌
- {"type":"bet"} 下注 1 单位
- {"type":"call"} 跟注
- {"type":"fold"} 弃牌`;

    case 'prisoners_dilemma':
      return `你正在玩囚徒困境（重复博弈 20 轮）。
- 每轮同时选择 cooperate(合作) 或 defect(背叛)
- 双方合作: 各得 3 分; 一方背叛: 背叛者 5 分, 合作者 0 分; 双方背叛: 各得 1 分
- 策略建议：以牙还牙(TFT)是经典最优策略

## 操作格式
- {"type":"cooperate"} 合作
- {"type":"defect"} 背叛`;

    case 'split_or_steal':
      return `你正在玩 Split or Steal — 基于 Golden Balls 电视节目。
- 2 人共享一个奖池（默认 10000）
- 先是谈判阶段（最多 6 条消息），然后各自秘密选择

## 结果
- 双方 Split: 平分奖池
- 一方 Steal: 偷者全拿
- 双方 Steal: 都得 0

## 操作格式
- 谈判阶段: {"type":"message","text":"你的谈判内容"} 或 {"type":"end_negotiate"}
- 决策阶段: {"type":"split"} 平分 或 {"type":"steal"} 独吞`;

    case 'ultimatum':
      return `你正在玩最后通牒博弈 (Ultimatum Game)。
- 2 轮制，每轮总额 100
- 第 1 轮你提议或回应，第 2 轮角色互换
- 提议者分配总额，回应者接受或拒绝
- 接受: 按提议分配; 拒绝: 双方本轮都得 0

## 操作格式
- 提议: {"type":"propose","myShare":数字} (你要拿的份额，0-100)
- 回应: {"type":"accept"} 接受 或 {"type":"reject"} 拒绝`;

    case 'liars_dice':
      return `你正在玩大话骰 (Liar's Dice)。
- 2 人各 5 颗骰子，1 是万能面（可算作任意面）
- 轮流喊数：宣称"至少 X 颗 Y 点"，必须比上家高
- 可以质疑(challenge)上家的喊数
- 质疑后揭骰：喊数正确→质疑者失 1 颗骰; 喊数错误→喊数者失 1 颗骰
- 先失去所有骰子的玩家输

## 喊数规则
- 可以提高数量（如"3个4"→"4个2"）
- 或相同数量但提高面值（如"3个4"→"3个5"）

## 操作格式
- {"type":"bid","quantity":数量,"faceValue":面值(1-6)}
- {"type":"challenge"} 质疑`;

    case 'sealed_bid_auction':
      return `你正在玩密封竞价拍卖 (Sealed-Bid Vickrey Auction)。
- 3 轮制，每轮拍卖一件物品
- 你会收到关于物品真实价值的线索
- Vickrey 规则：出价最高者赢，但只需支付第二高的出价
- 利润 = 物品真实价值 - 第二高出价

## 策略
- 出价接近你估计的真实价值是最优策略
- 出价太高可能亏损，太低可能错过

## 操作格式
- {"type":"bid","amount":出价金额}`;

    case 'liars_auction':
      return `你正在玩谎言拍卖行 (Liar's Auction)。
- 6 轮制，每轮拍卖一件物品，每人起始 100 金
- 每人收到关于物品价值的私密线索（真实的）
- 讨论阶段可以分享或谎报你的线索
- 讨论后密封出价，最高出价者获得物品

## 操作格式
- 讨论: {"type":"chat","message":"你的消息"} 或 {"type":"end_discussion"}
- 出价: {"type":"bid","amount":出价金额}`;

    case 'silicon_storm':
      return `你正在玩碳硅风暴 (Silicon Storm) — 类似 Coup 的角色 Bluffing 游戏。
- 2 人对决，每人 2 条命 + 2 金币 + 2 张角色牌
- 角色: assassin(刺客), merchant(商人), guardian(守卫), spy(间谍), diplomat(外交官)

## 行动阶段操作
- {"type":"income"} 收入 +1 金
- {"type":"foreign_aid"} 外援 +2 金
- {"type":"tax"} 收税 +3 金（声称有商人，可被质疑）
- {"type":"steal","target":"对手ID"} 偷取对手 2 金（声称有间谍）
- {"type":"assassinate","target":"对手ID"} 刺杀，花 3 金（声称有刺客）
- {"type":"coup","target":"对手ID"} 政变，花 7 金（不可阻挡）

## 质疑阶段
- {"type":"challenge"} 质疑对手声称的角色
- {"type":"pass"} 放行
- {"type":"block","claimedRole":"guardian"} 用守卫阻挡

## 规则
- 10 金以上必须政变
- 质疑成功→对手失 1 命; 质疑失败→你失 1 命
- 命归零则被淘汰`;

    default:
      return `你正在玩 ${gameType} 博弈游戏。请根据当前状态和可选操作做出最优决策。`;
  }
}

// ============================================================
// LLM Bot Decision
// ============================================================

/** Full result from an LLM decision, including log data */
export interface LLMDecisionResult {
  action: unknown;
  systemPrompt: string;
  userPrompt: string;
  rawResponse?: string;
  parsedAction?: unknown;
  usedFallback: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Ask the LLM to choose an action given the current game state.
 * Returns full decision result including all data needed for logging.
 */
export async function llmBotDecide(
  gameType: string,
  playerView: Record<string, unknown>,
  legalActions: unknown[],
  model: LLMModel,
  playerId: string,
): Promise<LLMDecisionResult> {
  const rules = getGameRulesPrompt(gameType);

  // Format legal actions for the LLM
  const actionsFormatted = legalActions.map((a, i) => {
    const action = a as Record<string, unknown>;
    return `${i}. ${JSON.stringify(action)}`;
  }).join('\n');

  const systemPrompt = `${rules}

你是一个聪明的博弈 AI 玩家。你的 ID 是 "${playerId}"。
请根据当前游戏状态，从可选操作中选择一个最优操作。

**重要**：你必须且只能返回一个 JSON 对象，不要包含任何其他文字、解释或 markdown。格式必须是可选操作列表中的某一个的完整 JSON。`;

  const userPrompt = `当前游戏状态:
${JSON.stringify(playerView, null, 2)}

可选操作 (选择其中一个):
${actionsFormatted}

请直接返回你选择的操作 JSON:`;

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 120s timeout

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      const fallback = getFallbackAction(gameType, playerView, playerId);
      return {
        action: fallback, systemPrompt, userPrompt,
        rawResponse: errText, usedFallback: true, latencyMs,
        error: `API error ${response.status}: ${errText}`,
      };
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      const fallback = getFallbackAction(gameType, playerView, playerId);
      return {
        action: fallback, systemPrompt, userPrompt,
        rawResponse: JSON.stringify(data), usedFallback: true, latencyMs,
        error: 'Empty response from API',
      };
    }

    // Parse LLM response — try to extract JSON
    const parsed = parseActionFromLLM(content, legalActions);
    if (parsed) {
      return {
        action: parsed, systemPrompt, userPrompt,
        rawResponse: content, parsedAction: parsed,
        usedFallback: false, latencyMs,
      };
    }

    const fallback = getFallbackAction(gameType, playerView, playerId);
    return {
      action: fallback, systemPrompt, userPrompt,
      rawResponse: content, usedFallback: true, latencyMs,
      error: `Failed to parse action from: ${content}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const fallback = getFallbackAction(gameType, playerView, playerId);
    return {
      action: fallback, systemPrompt, userPrompt,
      usedFallback: true, latencyMs,
      error: String(err),
    };
  }
}

/**
 * Try to parse a valid action from the LLM response text.
 */
function parseActionFromLLM(text: string, legalActions: unknown[]): unknown | null {
  try {
    // Strip markdown code blocks if present
    let clean = text.replace(/```json?\s*|\s*```/g, '').trim();
    
    // Try to extract JSON from text (LLM might add extra text)
    const jsonMatch = clean.match(/\{[^}]*\}/s);
    if (jsonMatch) clean = jsonMatch[0];
    
    const parsed = JSON.parse(clean);
    
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      // For actions with flexible numeric values (bid, propose),
      // accept the LLM's value if the type matches a legal action
      const typeMatch = legalActions.find(la => 
        (la as Record<string, unknown>).type === parsed.type
      );
      
      if (typeMatch) {
        // Merge LLM's values onto the legal action template
        const result = { ...(typeMatch as Record<string, unknown>) };
        
        // Preserve LLM's numeric choices
        if ('amount' in parsed && typeof parsed.amount === 'number') {
          result.amount = parsed.amount;
        }
        if ('myShare' in parsed && typeof parsed.myShare === 'number') {
          result.myShare = Math.max(0, Math.min(100, parsed.myShare));
        }
        if ('quantity' in parsed && typeof parsed.quantity === 'number') {
          result.quantity = parsed.quantity;
        }
        if ('faceValue' in parsed && typeof parsed.faceValue === 'number') {
          result.faceValue = parsed.faceValue;
        }
        if ('cardIndex' in parsed && typeof parsed.cardIndex === 'number') {
          result.cardIndex = parsed.cardIndex;
        }
        if ('target' in parsed && typeof parsed.target === 'string') {
          result.target = parsed.target;
        }
        if ('tier' in parsed && typeof parsed.tier === 'string') {
          result.tier = parsed.tier;
        }
        if ('message' in parsed && typeof parsed.message === 'string') {
          result.message = parsed.message;
        }
        if ('text' in parsed && typeof parsed.text === 'string') {
          result.text = parsed.text;
        }
        if ('claim' in parsed && typeof parsed.claim === 'string') {
          result.claim = parsed.claim;
        }
        if ('claimedRole' in parsed && typeof parsed.claimedRole === 'string') {
          result.claimedRole = parsed.claimedRole;
        }

        return result;
      }
    }
  } catch { /* continue to fallback */ }

  // Try to match by action type name from text
  const typeNames = [...new Set(legalActions.map(a => String((a as Record<string, unknown>).type)))];
  for (const typeName of typeNames) {
    if (text.toLowerCase().includes(typeName.toLowerCase())) {
      return legalActions.find(a => (a as Record<string, unknown>).type === typeName);
    }
  }

  return null;
}

/** Fallback: use engine's timeout action */
function getFallbackAction(
  gameType: string,
  _playerView: Record<string, unknown>,
  _playerId: string,
): unknown {
  const factory = getPluginFactory(gameType);
  if (!factory) return { type: 'silence' };
  // Return a simple default action based on game type
  switch (gameType) {
    case 'heist_royale': return { type: 'silence' };
    case 'texas_holdem_hu': return { type: 'fold' };
    case 'kuhn_poker': return { type: 'check' };
    case 'prisoners_dilemma': return { type: 'cooperate' };
    case 'split_or_steal': return { type: 'split' };
    case 'ultimatum': {
      const phase = (_playerView as any).phase ?? (_playerView as any).role;
      if (phase === 'propose' || (_playerView as any).role === '提议者' || (_playerView as any).role === 'proposer') {
        return { type: 'propose', myShare: 50 };
      }
      return { type: 'accept' };
    }
    case 'liars_dice': return { type: 'challenge' };
    case 'sealed_bid_auction': return { type: 'bid', amount: 30 };
    case 'liars_auction': return { type: 'end_discussion' };
    case 'silicon_storm': return { type: 'income' };
    default: return { type: 'fold' };
  }
}

/** Generate a bot player name based on its model */
export function getLLMBotName(model: LLMModel): string {
  const names: Record<LLMModel, string> = {
    'qwen3.5-plus': 'Qwen-3.5',
    'kimi-k2.5': 'Kimi-K2.5',
    'MiniMax-M2.5': 'MiniMax-M2.5',
    'glm-5': 'GLM-5',
  };
  return names[model] || model;
}
