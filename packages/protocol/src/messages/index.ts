// ============================================================
// Protocol messages — unified export (Interface Contract)
// ============================================================

// Envelope
export type { MessageType, MessageEnvelope, MessageDirection } from './envelope';

// Auth
export type {
  ClientHelloPayload, ClientHelloMessage,
  ServerHelloPayload, ServerHelloMessage,
  AuthErrorPayload, AuthErrorMessage,
  HeartbeatPayload, HeartbeatMessage,
} from './auth';

// Matchmaking
export type {
  JoinQueuePayload, JoinQueueMessage,
  LeaveQueuePayload, LeaveQueueMessage,
  QueueStatusPayload, QueueStatusMessage,
  MatchFoundPayload, MatchFoundMessage,
} from './matchmaking';

// Room
export type {
  CreateRoomPayload, CreateRoomMessage,
  JoinRoomPayload, JoinRoomMessage,
  RoomCreatedPayload, RoomCreatedMessage,
  RoomJoinedPayload, RoomJoinedMessage,
} from './room';

// Game
export type {
  GameStartPayload, GameStartMessage,
  GameStatePayload, GameStateMessage,
  ActionRequestPayload, ActionRequestMessage,
  GameActionPayload, GameActionMessage,
  ActionResultPayload, ActionResultMessage,
  ActionErrorPayload, ActionErrorMessage,
  TimeoutWarningPayload, TimeoutWarningMessage,
  TimeoutActionPayload, TimeoutActionMessage,
  HandResultPayload, HandResultMessage,
  GameEndPayload, GameEndMessage,
} from './game';

// Observer
export type {
  ObserverSubscribePayload, ObserverSubscribeMessage,
  ObserverStatePayload, ObserverStateMessage,
  ObserverHandResultPayload, ObserverHandResultMessage,
  ObserverGameEndPayload, ObserverGameEndMessage,
} from './observer';

// Error
export { ErrorCode, ERROR_NAMES } from './error';
export type { ErrorPayload, ErrorMessage } from './error';

// Union type of all messages
import type { MessageEnvelope } from './envelope';
import type { ClientHelloPayload, ServerHelloPayload, AuthErrorPayload, HeartbeatPayload } from './auth';
import type { JoinQueuePayload, LeaveQueuePayload, QueueStatusPayload, MatchFoundPayload } from './matchmaking';
import type { CreateRoomPayload, JoinRoomPayload, RoomCreatedPayload, RoomJoinedPayload } from './room';
import type {
  GameStartPayload, GameStatePayload, ActionRequestPayload, GameActionPayload,
  ActionResultPayload, ActionErrorPayload, TimeoutWarningPayload, TimeoutActionPayload,
  HandResultPayload, GameEndPayload,
} from './game';
import type { ObserverSubscribePayload, ObserverStatePayload, ObserverHandResultPayload, ObserverGameEndPayload } from './observer';
import type { ErrorPayload } from './error';

/** Union of all possible Arena-Protocol messages */
export type ArenaMessage =
  | MessageEnvelope<'client_hello', ClientHelloPayload>
  | MessageEnvelope<'server_hello', ServerHelloPayload>
  | MessageEnvelope<'auth_error', AuthErrorPayload>
  | MessageEnvelope<'heartbeat', HeartbeatPayload>
  | MessageEnvelope<'join_queue', JoinQueuePayload>
  | MessageEnvelope<'leave_queue', LeaveQueuePayload>
  | MessageEnvelope<'queue_status', QueueStatusPayload>
  | MessageEnvelope<'match_found', MatchFoundPayload>
  | MessageEnvelope<'create_room', CreateRoomPayload>
  | MessageEnvelope<'join_room', JoinRoomPayload>
  | MessageEnvelope<'room_created', RoomCreatedPayload>
  | MessageEnvelope<'room_joined', RoomJoinedPayload>
  | MessageEnvelope<'game_start', GameStartPayload>
  | MessageEnvelope<'game_state', GameStatePayload>
  | MessageEnvelope<'action_request', ActionRequestPayload>
  | MessageEnvelope<'game_action', GameActionPayload>
  | MessageEnvelope<'action_result', ActionResultPayload>
  | MessageEnvelope<'action_error', ActionErrorPayload>
  | MessageEnvelope<'timeout_warning', TimeoutWarningPayload>
  | MessageEnvelope<'timeout_action', TimeoutActionPayload>
  | MessageEnvelope<'hand_result', HandResultPayload>
  | MessageEnvelope<'game_end', GameEndPayload>
  | MessageEnvelope<'observer_subscribe', ObserverSubscribePayload>
  | MessageEnvelope<'observer_state', ObserverStatePayload>
  | MessageEnvelope<'observer_hand_result', ObserverHandResultPayload>
  | MessageEnvelope<'observer_game_end', ObserverGameEndPayload>
  | MessageEnvelope<'error', ErrorPayload>;
