// ============================================================
// Error codes and generic error message
// ============================================================

import type { MessageEnvelope } from './envelope';

/** Arena-Protocol error codes */
export enum ErrorCode {
  // Auth errors (1xxx)
  AUTH_FAILED = 1001,
  VERSION_MISMATCH = 1002,
  SESSION_EXPIRED = 1003,

  // Room errors (2xxx)
  ROOM_NOT_FOUND = 2001,
  ROOM_FULL = 2002,
  ALREADY_IN_ROOM = 2003,

  // Action errors (3xxx)
  INVALID_ACTION = 3001,
  ILLEGAL_ACTION = 3002,
  NOT_YOUR_TURN = 3003,
  ACTION_TIMEOUT = 3004,

  // Rate limiting (4xxx)
  RATE_LIMITED = 4001,

  // Internal (9xxx)
  INTERNAL_ERROR = 9999,
}

/** Error code names */
export const ERROR_NAMES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_FAILED]: 'AUTH_FAILED',
  [ErrorCode.VERSION_MISMATCH]: 'VERSION_MISMATCH',
  [ErrorCode.SESSION_EXPIRED]: 'SESSION_EXPIRED',
  [ErrorCode.ROOM_NOT_FOUND]: 'ROOM_NOT_FOUND',
  [ErrorCode.ROOM_FULL]: 'ROOM_FULL',
  [ErrorCode.ALREADY_IN_ROOM]: 'ALREADY_IN_ROOM',
  [ErrorCode.INVALID_ACTION]: 'INVALID_ACTION',
  [ErrorCode.ILLEGAL_ACTION]: 'ILLEGAL_ACTION',
  [ErrorCode.NOT_YOUR_TURN]: 'NOT_YOUR_TURN',
  [ErrorCode.ACTION_TIMEOUT]: 'ACTION_TIMEOUT',
  [ErrorCode.RATE_LIMITED]: 'RATE_LIMITED',
  [ErrorCode.INTERNAL_ERROR]: 'INTERNAL_ERROR',
};

/** S→C: Generic error message */
export interface ErrorPayload {
  error_code: number;
  error_name: string;
  message: string;
}
export type ErrorMessage = MessageEnvelope<'error', ErrorPayload>;
