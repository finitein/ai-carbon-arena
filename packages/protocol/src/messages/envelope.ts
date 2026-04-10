// ============================================================
// Message Envelope — shared wrapper for all Arena-Protocol messages
// ============================================================

/** All possible message types in the Arena Protocol */
export type MessageType =
  // Auth
  | 'client_hello'
  | 'server_hello'
  | 'auth_error'
  // Heartbeat
  | 'heartbeat'
  // Matchmaking
  | 'join_queue'
  | 'leave_queue'
  | 'queue_status'
  | 'match_found'
  // Room
  | 'create_room'
  | 'join_room'
  | 'room_created'
  | 'room_joined'
  // Game
  | 'game_start'
  | 'game_state'
  | 'action_request'
  | 'game_action'
  | 'action_result'
  | 'action_error'
  | 'timeout_warning'
  | 'timeout_action'
  | 'hand_result'
  | 'game_end'
  // Observer
  | 'observer_subscribe'
  | 'observer_state'
  | 'observer_hand_result'
  | 'observer_game_end'
  // Error
  | 'error';

/** Message envelope — all messages share this outer structure */
export interface MessageEnvelope<T extends MessageType = MessageType, P = unknown> {
  type: T;
  seq: number;
  timestamp: string;
  payload: P;
}

/** Direction of message */
export type MessageDirection = 'C2S' | 'S2C' | 'BOTH';
