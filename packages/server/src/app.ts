// ============================================================
// Fastify Application Entry Point
// ============================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { agentRoutes } from './routes/agents';
import { authRoutes } from './routes/auth';
import { leaderboardRoutes } from './routes/leaderboard';
import { matchRoutes } from './routes/matches';
import { replayRoutes } from './routes/replay';
import { dataExportRoutes } from './routes/data-export';
import { setupAgentWebSocket } from './ws/agent-ws';
import { setupObserverWebSocket } from './ws/observer-ws';
import { RoomManager } from './services/room-manager';
import { Matchmaker } from './services/matchmaker';
import { RatingService } from './services/rating';
import { GameSessionManager } from './services/game-session';
import { AuthService } from './services/auth';
import { ReplayLogger } from './services/replay-logger';
import { AIActionLogger } from './services/ai-action-logger';
import { registerErrorHandler } from './services/error-handler';
import { getDatabase, closeDatabase } from './db/connection';
import type { AppDatabase } from './db/connection';

export interface AppContext {
  roomManager: RoomManager;
  matchmaker: Matchmaker;
  ratingService: RatingService;
  gameSessionManager: GameSessionManager;
  authService: AuthService;
  replayLogger: ReplayLogger;
  db: AppDatabase;
}

async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Unified error handling
  registerErrorHandler(app);

  // Plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  await app.register(websocket);

  // Database
  const db = getDatabase();

  // Application context (shared services)
  const roomManager = new RoomManager();
  const ratingService = new RatingService();
  const replayLogger = new ReplayLogger();
  const aiLogger = new AIActionLogger(db);
  const gameSessionManager = new GameSessionManager(roomManager, replayLogger, aiLogger);
  const matchmaker = new Matchmaker(roomManager, gameSessionManager);
  const authService = new AuthService(db);

  const ctx: AppContext = {
    roomManager,
    matchmaker,
    ratingService,
    gameSessionManager,
    authService,
    replayLogger,
    db,
  };

  // Decorate all requests with context
  app.decorate('ctx', ctx);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // REST API Routes
  app.register(agentRoutes, { prefix: '/api/agents' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(leaderboardRoutes, { prefix: '/api/leaderboard' });
  app.register(matchRoutes, { prefix: '/api/matches' });
  app.register(replayRoutes, { prefix: '/api/replay' });
  app.register(dataExportRoutes, { prefix: '/api/data' });

  // WebSocket Routes
  app.register(async (wsApp) => {
    setupAgentWebSocket(wsApp, ctx);
    setupObserverWebSocket(wsApp, ctx);
  });

  // Wire game session callbacks → broadcast to player WebSockets
  gameSessionManager.setCallbacks({
    onGameStart: (roomId, session) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      const state = session.engine.getObserverView();
      for (const player of room.players) {
        if (player.ws && player.ws.readyState === 1) {
          player.ws.send(JSON.stringify({
            type: 'match_found',
            seq: 0,
            timestamp: new Date().toISOString(),
            payload: {
              room_id: roomId,
              match_id: session.id,
              game_type: session.gameType,
              opponent: room.players.find(p => p.agentId !== player.agentId)?.agentName || 'unknown',
              your_id: player.agentId,
              state,
            },
          }));
        }
      }
    },
    onActionRequest: (roomId, session) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      const fullState = session.engine.getFullState();
      const currentPlayerId = fullState.players[fullState.currentPlayerIndex]?.id;
      for (const player of room.players) {
        if (player.ws && player.ws.readyState === 1) {
          // Send player-specific view
          const view = session.engine.getPlayerView(player.agentId);
          player.ws.send(JSON.stringify({
            type: 'action_request',
            seq: 0,
            timestamp: new Date().toISOString(),
            payload: {
              room_id: roomId,
              match_id: session.id,
              game_type: session.gameType,
              your_turn: currentPlayerId === player.agentId,
              state: view,
              legal_actions: currentPlayerId === player.agentId
                ? session.engine.getLegalActions(player.agentId)
                : [],
            },
          }));
        }
      }
    },
    onGameEnd: (roomId, session) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      for (const player of room.players) {
        if (player.ws && player.ws.readyState === 1) {
          // Send player-specific view so each player gets their own payout/score data
          const state = session.engine.getPlayerView(player.agentId);
          player.ws.send(JSON.stringify({
            type: 'game_end',
            seq: 0,
            timestamp: new Date().toISOString(),
            payload: {
              room_id: roomId,
              match_id: session.id,
              game_type: session.gameType,
              state,
            },
          }));
        }
      }
    },
  });

  // Start matchmaking loop
  matchmaker.start();

  // Graceful shutdown
  app.addHook('onClose', () => {
    matchmaker.stop();
    closeDatabase();
  });

  return app;
}

// Start server
async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '8055', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`碳硅竞技场 Backend running on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export { buildApp };
