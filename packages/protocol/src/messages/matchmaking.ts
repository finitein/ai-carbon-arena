// ============================================================
// Matchmaking messages
// ============================================================

import type { MessageEnvelope } from './envelope';

/** C→S: Join the matchmaking queue */
export interface JoinQueuePayload {
  game_type: string;
  preferences?: {
    rating_range?: number;
  };
}
export type JoinQueueMessage = MessageEnvelope<'join_queue', JoinQueuePayload>;

/** C→S: Leave the matchmaking queue */
export interface LeaveQueuePayload {
  game_type: string;
}
export type LeaveQueueMessage = MessageEnvelope<'leave_queue', LeaveQueuePayload>;

/** S→C: Queue status update */
export interface QueueStatusPayload {
  status: 'searching' | 'matched' | 'cancelled';
  game_type: string;
  queue_position?: number;
  estimated_wait_ms?: number;
  elapsed_ms?: number;
}
export type QueueStatusMessage = MessageEnvelope<'queue_status', QueueStatusPayload>;

/** S→C: Match found */
export interface MatchFoundPayload {
  room_id: string;
  game_type: string;
  opponent: {
    name: string;
    rating: number;
    total_games: number;
  };
  match_type: 'ranked' | 'calibration';
}
export type MatchFoundMessage = MessageEnvelope<'match_found', MatchFoundPayload>;
