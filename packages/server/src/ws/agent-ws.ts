import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app';
import { getRequiredPlayers } from '../services/room-manager';
import type { RoomPlayer } from '../services/room-manager';
import { LLM_MODELS, getLLMBotName } from '../bots/llm-bot';
import { isValidGameType } from '../services/plugin-registry';

export function setupAgentWebSocket(app: FastifyInstance, ctx: AppContext): void {
  app.get('/ws/agent', { websocket: true }, (connection, _req) => {
    const ws = connection.socket;
    let agentId: string | null = null;
    let sessionId: string | null = null;
    let seq = 0;

    const sendMessage = (type: string, payload: unknown) => {
      seq++;
      ws.send(JSON.stringify({ type, seq, timestamp: new Date().toISOString(), payload }));
    };

    ws.on('message', (rawData: Buffer | ArrayBuffer | Buffer[]) => {
      const raw = rawData.toString();

      let message: { type?: string; payload?: Record<string, unknown> };
      try {
        message = JSON.parse(raw);
      } catch {
        sendMessage('error', { error_code: 4000, error_name: 'PARSE_ERROR', message: 'Invalid JSON' });
        return;
      }

      const type = message.type;
      const payload = message.payload || {};

      switch (type) {
        case 'client_hello': {
          agentId = `agent_${Date.now()}`;
          sessionId = `sess_${Date.now()}`;

          sendMessage('server_hello', {
            session_id: sessionId,
            server_epoch: 1,
            agent_id: agentId,
            protocol_version: '1.0',
            heartbeat_interval_ms: 30000,
            server_time: new Date().toISOString(),
          });
          break;
        }

        case 'heartbeat': {
          sendMessage('heartbeat', { pong: true });
          break;
        }

        case 'join_queue': {
          if (!agentId) {
            sendMessage('error', { error_code: 1001, error_name: 'AUTH_FAILED', message: 'Must authenticate first' });
            return;
          }
          const gameType = (payload.game_type as string) || 'texas_holdem_hu';
          
          if (!isValidGameType(gameType)) {
            sendMessage('error', { error_code: 4004, error_name: 'GAME_NOT_FOUND', message: `Unknown game type: ${gameType}` });
            return;
          }

          const matchMode = (payload.match_mode as string) || 'vs_ai';

          if (matchMode === 'vs_ai') {
            // === Instant AI matching — bypass matchmaker queue ===
            const totalPlayers = getRequiredPlayers(gameType);
            const room = ctx.roomManager.createRoom(gameType, 'ranked');
            const humanPlayer: RoomPlayer = {
              agentId, agentName: agentId, rating: 1500,
              ws: ws as any, sessionId: sessionId!,
            };
            ctx.roomManager.joinRoom(room.id, humanPlayer);

            // Fill remaining seats with AI bots
            for (let i = 1; i < totalPlayers; i++) {
              const model = LLM_MODELS[(i - 1) % LLM_MODELS.length];
              const botPlayer: RoomPlayer = {
                agentId: `llm_${model}_${Date.now()}_${i}`,
                agentName: getLLMBotName(model),
                rating: 1500,
                ws: null,
                sessionId: `bot_session_${Date.now()}_${i}`,
              };
              ctx.roomManager.joinRoom(room.id, botPlayer);
            }

            console.log(`[AgentWS] Instant AI match for ${gameType} in room ${room.id}`);
            ctx.gameSessionManager.startSession(room.id, gameType);
          } else {
            // Normal queue-based matching (vs_human / mixed)
            ctx.matchmaker.enqueue(
              { agentId, agentName: agentId, rating: 1500, ws: ws as any, sessionId: sessionId! },
              gameType,
            );
            sendMessage('queue_status', {
              status: 'searching',
              game_type: gameType,
              queue_position: ctx.matchmaker.getQueuePosition(agentId),
            });
          }
          break;
        }

        case 'leave_queue': {
          if (agentId) {
            ctx.matchmaker.dequeue(agentId);
            sendMessage('queue_status', { status: 'cancelled', game_type: payload.game_type || 'texas_holdem_hu' });
          }
          break;
        }

        case 'game_action': {
          if (!agentId) return;

          const roomId = payload.room_id as string;

          // Pass the raw action through to the engine (game-agnostic)
          // The frontend sends the full action object from getLegalActions()
          const action = payload.action_data || payload;
          // Strip non-action fields
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { room_id: _rid, hand_num: _hn, action_data: _ad, ...rawAction } = action as Record<string, unknown>;
          
          // If the frontend sent the action inside 'action_data', use that directly
          // Otherwise build from top-level fields
          const gameAction = payload.action_data || rawAction;

          const accepted = ctx.gameSessionManager.processAction(roomId, agentId, gameAction);
          sendMessage('action_result', {
            room_id: roomId,
            accepted,
            action: gameAction,
          });
          break;
        }
      }
    });

    ws.on('close', () => {
      if (agentId) {
        ctx.matchmaker.dequeue(agentId);
        ctx.roomManager.leaveRoom(agentId);
      }
    });
  });
}
