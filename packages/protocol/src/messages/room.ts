// ============================================================
// Room messages
// ============================================================

import type { MessageEnvelope } from './envelope';

/** C→S: Create a private room */
export interface CreateRoomPayload {
  game_type: string;
  config?: {
    starting_stack?: number;
    small_blind?: number;
    big_blind?: number;
    action_timeout_ms?: number;
  };
}
export type CreateRoomMessage = MessageEnvelope<'create_room', CreateRoomPayload>;

/** C→S: Join a private room */
export interface JoinRoomPayload {
  room_id: string;
}
export type JoinRoomMessage = MessageEnvelope<'join_room', JoinRoomPayload>;

/** S→C: Room created successfully */
export interface RoomCreatedPayload {
  room_id: string;
  game_type: string;
  config: {
    starting_stack: number;
    small_blind: number;
    big_blind: number;
    action_timeout_ms: number;
  };
  invite_code: string;
}
export type RoomCreatedMessage = MessageEnvelope<'room_created', RoomCreatedPayload>;

/** S→C: Joined a room successfully */
export interface RoomJoinedPayload {
  room_id: string;
  game_type: string;
  opponent: {
    name: string;
    rating: number;
    total_games: number;
  };
}
export type RoomJoinedMessage = MessageEnvelope<'room_joined', RoomJoinedPayload>;
