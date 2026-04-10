// ============================================================
// Game messages — core game loop protocol
// ============================================================

import type { MessageEnvelope } from './envelope';

/** S→C: Game starts */
export interface GameStartPayload {
  room_id: string;
  match_id: string;
  game_type: string;
  config: {
    starting_stack: number;
    small_blind: number;
    big_blind: number;
    action_timeout_ms: number;
  };
  your_seat: 'player_a' | 'player_b';
  opponent: {
    name: string;
    rating: number;
  };
}
export type GameStartMessage = MessageEnvelope<'game_start', GameStartPayload>;

/** S→C: Game state update (observer or after opponent action) */
export interface GameStatePayload {
  room_id: string;
  hand_num: number;
  round: string;
  game_state: Record<string, unknown>;
  last_action?: {
    player: string;
    action: string;
    amount?: number;
  };
}
export type GameStateMessage = MessageEnvelope<'game_state', GameStatePayload>;

/** S→C: Request player to take an action */
export interface ActionRequestPayload {
  room_id: string;
  hand_num: number;
  round: string;
  legal_actions: Array<{
    action: string;
    min_amount?: number;
    max_amount?: number;
  }>;
  deadline_ms: number;
  game_state: Record<string, unknown>;
}
export type ActionRequestMessage = MessageEnvelope<'action_request', ActionRequestPayload>;

/** C→S: Player submits an action */
export interface GameActionPayload {
  room_id: string;
  hand_num: number;
  action: string;
  amount?: number;
  /** 白盒赛区字段 — Chain-of-Thought (V2-W1/W2) */
  thought_process?: string;
  /** 结构化 CoT (白盒赛区 — V2-W2 CoT Schema) */
  cot?: {
    /** 推理链 — 决策步骤说明 */
    reasoning_chain: string[];
    /** 概率评估 — 各动作的胜率估计 */
    action_probabilities?: Record<string, number>;
    /** 对手建模 — 对手类型和风格推断 */
    opponent_model?: {
      estimated_style: string;
      aggression_factor: number;
      bluff_frequency: number;
    };
    /** 手牌评估 — 当前手牌的强度分析 */
    hand_evaluation?: {
      hand_strength: number;
      potential: number;
      position_advantage: number;
    };
    /** Token 用量 (用于效能指数计算) */
    token_usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      latency_ms: number;
    };
  };
  /** 赛区标识: 'whitebox' | 'blackbox' */
  league?: 'whitebox' | 'blackbox';
}
export type GameActionMessage = MessageEnvelope<'game_action', GameActionPayload>;

/** S→C: Action accepted */
export interface ActionResultPayload {
  room_id: string;
  hand_num: number;
  accepted: boolean;
  action: {
    action: string;
    amount?: number;
  };
}
export type ActionResultMessage = MessageEnvelope<'action_result', ActionResultPayload>;

/** S→C: Illegal action rejected */
export interface ActionErrorPayload {
  room_id: string;
  hand_num: number;
  error_code: number;
  error_name: string;
  message: string;
  rejected_action: {
    action: string;
    amount?: number;
  };
  legal_actions: Array<{
    action: string;
    min_amount?: number;
    max_amount?: number;
  }>;
}
export type ActionErrorMessage = MessageEnvelope<'action_error', ActionErrorPayload>;

/** S→C: Timeout warning (5 seconds before deadline) */
export interface TimeoutWarningPayload {
  room_id: string;
  hand_num: number;
  remaining_ms: number;
  timeout_action: string;
}
export type TimeoutWarningMessage = MessageEnvelope<'timeout_warning', TimeoutWarningPayload>;

/** S→C: Timeout action executed */
export interface TimeoutActionPayload {
  room_id: string;
  hand_num: number;
  player: string;
  executed_action: {
    action: string;
  };
  reason: string;
}
export type TimeoutActionMessage = MessageEnvelope<'timeout_action', TimeoutActionPayload>;

/** S→C: Hand result */
export interface HandResultPayload {
  room_id: string;
  hand_num: number;
  winner: 'you' | 'opponent' | 'draw';
  pot: number;
  your_final_stack: number;
  opponent_final_stack: number;
  showdown?: {
    your_cards: string[];
    opponent_cards: string[];
    community_cards: string[];
    your_hand_rank: string;
    opponent_hand_rank: string;
  };
}
export type HandResultMessage = MessageEnvelope<'hand_result', HandResultPayload>;

/** S→C: Game ended */
export interface GameEndPayload {
  room_id: string;
  result: 'win' | 'lose' | 'draw';
  total_hands: number;
  final_stack: number;
  opponent_final_stack: number;
  rating_change: number;
  new_rating: number;
  match_id: string;
}
export type GameEndMessage = MessageEnvelope<'game_end', GameEndPayload>;
