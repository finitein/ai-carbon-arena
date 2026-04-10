// ============================================================
// WebSocket hooks for real-time data
// ============================================================

function getWsBase(): string {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return explicit;
  // Use current page origin with ws/wss protocol
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

export type WsMessageHandler = (type: string, payload: unknown) => void;

/**
 * Create an observer WebSocket connection.
 * Returns cleanup function.
 */
export function connectObserver(
  mode: 'random' | 'room',
  roomId: string | null,
  onMessage: WsMessageHandler,
  onClose?: () => void,
): () => void {
  let ws: WebSocket | null = null;

  try {
    ws = new WebSocket(`${getWsBase()}/ws/observer`);
  } catch {
    return () => {};
  }

  ws.onopen = () => {
    ws?.send(JSON.stringify({
      type: 'observer_subscribe',
      seq: 1,
      timestamp: new Date().toISOString(),
      payload: { mode, room_id: roomId },
    }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      onMessage(msg.type, msg.payload);
    } catch { /* ignore parse errors */ }
  };

  ws.onclose = () => {
    onClose?.();
  };

  return () => {
    ws?.close();
  };
}

/**
 * Create a player WebSocket connection for human vs AI.
 * Returns send function and cleanup function.
 */
export function connectPlayer(
  onMessage: WsMessageHandler,
  onClose?: () => void,
): { ws: WebSocket | null; send: (type: string, payload: unknown) => void; close: () => void } {
  let ws: WebSocket | null = null;
  let seq = 0;

  try {
    ws = new WebSocket(`${getWsBase()}/ws/agent`);
  } catch {
    return {
      ws: null,
      send: () => {},
      close: () => {},
    };
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      onMessage(msg.type, msg.payload);
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    onClose?.();
  };

  return {
    ws,
    send: (type: string, payload: unknown) => {
      seq++;
      ws?.send(JSON.stringify({
        type,
        seq,
        timestamp: new Date().toISOString(),
        payload,
      }));
    },
    close: () => {
      ws?.close();
    },
  };
}
