// ============================================================
// Auth messages
// ============================================================

import type { MessageEnvelope } from './envelope';

/** C→S: Client authentication handshake */
export interface ClientHelloPayload {
  api_key: string;
  protocol_version: string;
  agent_name: string;
  client_info?: {
    sdk_version?: string;
    language?: string;
  };
  // For reconnection
  reconnect_session?: string;
  last_seen_seq?: number;
}
export type ClientHelloMessage = MessageEnvelope<'client_hello', ClientHelloPayload>;

/** S→C: Authentication success */
export interface ServerHelloPayload {
  session_id: string;
  server_epoch: number;
  agent_id: string;
  protocol_version: string;
  heartbeat_interval_ms: number;
  server_time: string;
  // Reconnection: missed messages
  missed_messages?: unknown[];
}
export type ServerHelloMessage = MessageEnvelope<'server_hello', ServerHelloPayload>;

/** S→C: Authentication failure */
export interface AuthErrorPayload {
  error_code: number;
  error_name: string;
  message: string;
}
export type AuthErrorMessage = MessageEnvelope<'auth_error', AuthErrorPayload>;

/** C↔S: Heartbeat (ping/pong) */
export interface HeartbeatPayload {
  ping?: boolean;
  pong?: boolean;
}
export type HeartbeatMessage = MessageEnvelope<'heartbeat', HeartbeatPayload>;
