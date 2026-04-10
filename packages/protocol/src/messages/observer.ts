// ============================================================
// Observer messages — public view for spectators
// ============================================================

import type { MessageEnvelope } from './envelope';

/** C→S: Subscribe to observe a room */
export interface ObserverSubscribePayload {
  mode: 'room' | 'random';
  room_id?: string;
}
export type ObserverSubscribeMessage = MessageEnvelope<'observer_subscribe', ObserverSubscribePayload>;

/** S→C: Observer state update */
export interface ObserverStatePayload {
  room_id: string;
  hand_num: number;
  round: string;
  game_state: {
    community_cards: string[];
    pot: number;
    player_a: {
      name: string;
      stack: number;
      bet_this_round: number;
      is_dealer: boolean;
      status: 'active' | 'folded' | 'all_in';
    };
    player_b: {
      name: string;
      stack: number;
      bet_this_round: number;
      is_dealer: boolean;
      status: 'active' | 'folded' | 'all_in';
    };
  };
  last_action?: {
    player: string;
    player_name: string;
    action: string;
    amount?: number;
  };
}
export type ObserverStateMessage = MessageEnvelope<'observer_state', ObserverStatePayload>;

/** S→C: Observer hand result */
export interface ObserverHandResultPayload {
  room_id: string;
  hand_num: number;
  winner: string;
  pot: number;
  result_type: 'showdown' | 'fold';
  showdown?: {
    player_a_cards: string[];
    player_b_cards: string[];
    community_cards: string[];
    player_a_hand_rank: string;
    player_b_hand_rank: string;
  };
  stacks_after: {
    player_a: number;
    player_b: number;
  };
}
export type ObserverHandResultMessage = MessageEnvelope<'observer_hand_result', ObserverHandResultPayload>;

/** S→C: Observer game end */
export interface ObserverGameEndPayload {
  room_id: string;
  match_id: string;
  winner: string;
  total_hands: number;
  final_stacks: {
    player_a: { name: string; stack: number };
    player_b: { name: string; stack: number };
  };
}
export type ObserverGameEndMessage = MessageEnvelope<'observer_game_end', ObserverGameEndPayload>;
