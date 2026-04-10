// ============================================================
// Codec — encode/decode + JSON Schema validation
// ============================================================

import type { ArenaMessage } from './messages/index';
import type { MessageType, MessageEnvelope } from './messages/envelope';

/** Validation error returned on decode failure */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errorCode: number = 3001,
    public readonly errorName: string = 'INVALID_ACTION',
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Valid message types that can be received from clients */
const VALID_CLIENT_TYPES: Set<MessageType> = new Set([
  'client_hello',
  'heartbeat',
  'join_queue',
  'leave_queue',
  'create_room',
  'join_room',
  'game_action',
  'observer_subscribe',
]);

/** Valid game action types */
const VALID_GAME_ACTIONS = new Set(['fold', 'check', 'call', 'bet', 'raise']);

/**
 * Encode a message to JSON string.
 */
export function encode(message: ArenaMessage): string {
  return JSON.stringify(message);
}

/**
 * Decode a raw JSON string into a validated message.
 * Strips unknown fields (additionalProperties: false equivalent).
 * Throws ValidationError on invalid input.
 */
export function decode(raw: string): ArenaMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ValidationError('Message must be a JSON object');
  }

  const msg = parsed as Record<string, unknown>;

  // Validate envelope
  if (typeof msg.type !== 'string') {
    throw new ValidationError('Missing or invalid "type" field');
  }
  if (typeof msg.seq !== 'number' || !Number.isInteger(msg.seq) || msg.seq < 1) {
    throw new ValidationError('Missing or invalid "seq" field (must be positive integer)');
  }
  if (typeof msg.timestamp !== 'string') {
    throw new ValidationError('Missing or invalid "timestamp" field');
  }
  if (!msg.payload || typeof msg.payload !== 'object') {
    throw new ValidationError('Missing or invalid "payload" field');
  }

  // Validate message type is a known type
  if (!VALID_CLIENT_TYPES.has(msg.type as MessageType)) {
    throw new ValidationError(`Unknown message type: ${msg.type}`);
  }

  // Type-specific validation
  const payload = msg.payload as Record<string, unknown>;
  validatePayload(msg.type as MessageType, payload);

  // Construct clean message (strip unknown fields)
  return {
    type: msg.type as MessageType,
    seq: msg.seq as number,
    timestamp: msg.timestamp as string,
    payload: sanitizePayload(msg.type as MessageType, payload),
  } as ArenaMessage;
}

/**
 * Create a server-side message with auto-populated timestamp.
 */
export function createMessage<T extends MessageType>(
  type: T,
  seq: number,
  payload: unknown,
): MessageEnvelope<T> {
  return {
    type,
    seq,
    timestamp: new Date().toISOString(),
    payload,
  } as MessageEnvelope<T>;
}

/** Validate payload based on message type */
function validatePayload(type: MessageType, payload: Record<string, unknown>): void {
  switch (type) {
    case 'client_hello':
      if (typeof payload.api_key !== 'string' || !payload.api_key) {
        throw new ValidationError('client_hello: missing api_key');
      }
      if (typeof payload.protocol_version !== 'string') {
        throw new ValidationError('client_hello: missing protocol_version');
      }
      if (typeof payload.agent_name !== 'string') {
        throw new ValidationError('client_hello: missing agent_name');
      }
      break;

    case 'game_action':
      if (typeof payload.room_id !== 'string') {
        throw new ValidationError('game_action: missing room_id');
      }
      if (typeof payload.hand_num !== 'number') {
        throw new ValidationError('game_action: missing hand_num');
      }
      if (typeof payload.action !== 'string' || !VALID_GAME_ACTIONS.has(payload.action)) {
        throw new ValidationError(
          `game_action: invalid action "${payload.action}". Must be one of: ${[...VALID_GAME_ACTIONS].join(', ')}`,
        );
      }
      if ((payload.action === 'raise' || payload.action === 'bet') && typeof payload.amount !== 'number') {
        throw new ValidationError('game_action: raise/bet requires numeric amount');
      }
      break;

    case 'join_queue':
      if (typeof payload.game_type !== 'string') {
        throw new ValidationError('join_queue: missing game_type');
      }
      break;

    case 'leave_queue':
      if (typeof payload.game_type !== 'string') {
        throw new ValidationError('leave_queue: missing game_type');
      }
      break;

    case 'create_room':
      if (typeof payload.game_type !== 'string') {
        throw new ValidationError('create_room: missing game_type');
      }
      break;

    case 'join_room':
      if (typeof payload.room_id !== 'string') {
        throw new ValidationError('join_room: missing room_id');
      }
      break;

    case 'observer_subscribe':
      if (typeof payload.mode !== 'string' || !['room', 'random'].includes(payload.mode)) {
        throw new ValidationError('observer_subscribe: invalid mode');
      }
      if (payload.mode === 'room' && typeof payload.room_id !== 'string') {
        throw new ValidationError('observer_subscribe: room mode requires room_id');
      }
      break;
  }
}

/** Strip unknown fields from payload to prevent injection */
function sanitizePayload(type: MessageType, payload: Record<string, unknown>): Record<string, unknown> {
  const allowedFields: Record<string, string[]> = {
    client_hello: ['api_key', 'protocol_version', 'agent_name', 'client_info', 'reconnect_session', 'last_seen_seq'],
    heartbeat: ['ping', 'pong'],
    join_queue: ['game_type', 'preferences'],
    leave_queue: ['game_type'],
    create_room: ['game_type', 'config'],
    join_room: ['room_id'],
    game_action: ['room_id', 'hand_num', 'action', 'amount', 'thought_process'],
    observer_subscribe: ['mode', 'room_id'],
  };

  const allowed = allowedFields[type];
  if (!allowed) return payload;

  const sanitized: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in payload) {
      sanitized[key] = payload[key];
    }
  }
  return sanitized;
}
