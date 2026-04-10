// ============================================================
// Observer WebSocket Handler
// ============================================================

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { AppContext } from '../app';

/** Track active observer connections */
const observers = new Map<string, Set<WebSocket>>();

export function setupObserverWebSocket(app: FastifyInstance, ctx: AppContext): void {
  app.get('/ws/observer', { websocket: true }, (connection, _req) => {
    const ws = connection.socket;
    let subscribedRoom: string | null = null;
    let seq = 0;

    const sendMessage = (type: string, payload: unknown) => {
      seq++;
      ws.send(JSON.stringify({ type, seq, timestamp: new Date().toISOString(), payload }));
    };

    ws.on('message', (rawData: Buffer | ArrayBuffer | Buffer[]) => {
      const raw = rawData.toString();

      let parsed: { type?: string; payload?: Record<string, unknown> };
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      if (parsed.type === 'observer_subscribe') {
        const p = parsed.payload || {};
        const mode = p.mode as string;
        const roomId = p.room_id as string;

        if (mode === 'room' && roomId) {
          subscribedRoom = roomId;
        } else if (mode === 'random') {
          const activeRooms = ctx.roomManager.getActiveRooms();
          if (activeRooms.length > 0) {
            subscribedRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)].id;
          }
        }

        if (subscribedRoom) {
          if (!observers.has(subscribedRoom)) {
            observers.set(subscribedRoom, new Set());
          }
          observers.get(subscribedRoom)!.add(ws);

          const session = ctx.gameSessionManager.getSessionByRoom(subscribedRoom);
          if (session) {
            const observerView = session.engine.getObserverView();
            sendMessage('observer_state', {
              room_id: subscribedRoom,
              game_state: observerView,
            });
          }
        }
      }
    });

    ws.on('close', () => {
      if (subscribedRoom && observers.has(subscribedRoom)) {
        observers.get(subscribedRoom)!.delete(ws);
        if (observers.get(subscribedRoom)!.size === 0) {
          observers.delete(subscribedRoom);
        }
      }
    });
  });
}

/** Broadcast observer state update to all observers of a room */
export function broadcastToObservers(roomId: string, type: string, payload: unknown): void {
  const roomObservers = observers.get(roomId);
  if (!roomObservers) return;

  const msg = JSON.stringify({ type, seq: 0, timestamp: new Date().toISOString(), payload });
  for (const ws of roomObservers) {
    try {
      ws.send(msg);
    } catch {
      roomObservers.delete(ws);
    }
  }
}
