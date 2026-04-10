// ============================================================
// Game Session Manager — orchestrates engine + protocol for a live match
// Supports all 10 game types via plugin registry
// ============================================================

import { EngineCore } from '@carbon-arena/engine';
import type { RoomManager } from './room-manager';
import type { ReplayLogger } from './replay-logger';
import { getPluginFactory } from './plugin-registry';
import { v4 as uuidv4 } from 'uuid';
import { llmBotDecide, type LLMModel } from '../bots/llm-bot';
import type { AIActionLogger } from './ai-action-logger';

export interface GameSession {
  id: string;
  roomId: string;
  gameType: string;
  engine: EngineCore<any, any>;
  actionTimer: ReturnType<typeof setTimeout> | null;
  startedAt: Date;
  status: 'playing' | 'finished';
}

export class GameSessionManager {
  private sessions: Map<string, GameSession> = new Map();
  private roomToSession: Map<string, string> = new Map();
  private readonly roomManager: RoomManager;
  private readonly replayLogger: ReplayLogger;
  private readonly aiLogger?: AIActionLogger;

  // Callbacks for sending messages to players
  private onGameStart?: (roomId: string, session: GameSession) => void;
  private onActionRequest?: (roomId: string, session: GameSession) => void;
  private onHandResult?: (roomId: string, session: GameSession) => void;
  private onGameEnd?: (roomId: string, session: GameSession) => void;

  constructor(roomManager: RoomManager, replayLogger: ReplayLogger, aiLogger?: AIActionLogger) {
    this.roomManager = roomManager;
    this.replayLogger = replayLogger;
    this.aiLogger = aiLogger;
  }

  /** Register event callbacks */
  setCallbacks(callbacks: {
    onGameStart?: (roomId: string, session: GameSession) => void;
    onActionRequest?: (roomId: string, session: GameSession) => void;
    onHandResult?: (roomId: string, session: GameSession) => void;
    onGameEnd?: (roomId: string, session: GameSession) => void;
  }): void {
    this.onGameStart = callbacks.onGameStart;
    this.onActionRequest = callbacks.onActionRequest;
    this.onHandResult = callbacks.onHandResult;
    this.onGameEnd = callbacks.onGameEnd;
  }

  /** Start a new game session for a room, with optional gameType override */
  startSession(roomId: string, gameType?: string): GameSession {
    const room = this.roomManager.getRoom(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    if (room.players.length < 2) throw new Error(`Room ${roomId} needs at least 2 players`);

    const resolvedGameType = gameType || room.gameType || 'texas_holdem_hu';

    // Look up plugin from registry
    const factory = getPluginFactory(resolvedGameType);
    if (!factory) {
      throw new Error(`Unknown game type: ${resolvedGameType}`);
    }

    const plugin = factory();
    const rngSeed = Date.now() + Math.floor(Math.random() * 100000);
    const matchId = uuidv4();

    const engine = new EngineCore(plugin, {
      gameType: resolvedGameType,
      players: room.players.map(p => p.agentId),
      settings: {
        startingStack: room.config.startingStack,
        smallBlind: room.config.smallBlind,
        bigBlind: room.config.bigBlind,
        actionTimeoutMs: room.config.actionTimeoutMs,
      },
    }, rngSeed);

    const session: GameSession = {
      id: matchId,
      roomId,
      gameType: resolvedGameType,
      engine,
      actionTimer: null,
      startedAt: new Date(),
      status: 'playing',
    };

    this.sessions.set(matchId, session);
    this.roomToSession.set(roomId, matchId);
    this.roomManager.startRoom(roomId, matchId);

    // Record replay: game start
    try {
      this.replayLogger.startMatch(
        matchId,
        resolvedGameType,
        room.players.map(p => ({ id: p.agentId, name: p.agentName })),
        engine.getObserverView(),
      );
    } catch {
      // Replay logging is non-critical; don't break the game
    }

    // Notify: game started
    this.onGameStart?.(roomId, session);

    // Request first action
    this.requestNextAction(session);

    return session;
  }

  /** Process an action from a player */
  processAction(roomId: string, agentId: string, action: any): boolean {
    const sessionId = this.roomToSession.get(roomId);
    if (!sessionId) return false;

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'playing') return false;

    const state = session.engine.getFullState();
    const currentPlayer = state.players[state.currentPlayerIndex];

    // Verify it's this player's turn
    if (currentPlayer.id !== agentId) return false;

    // Clear action timer
    if (session.actionTimer) {
      clearTimeout(session.actionTimer);
      session.actionTimer = null;
    }

    try {
      session.engine.applyAction(agentId, action);
    } catch (e: any) {
      console.error(`[GameSession] Action rejected for ${agentId}:`, e.message, 'Action:', action);
      return false; // Illegal action
    }

    // Record replay: action
    try {
      this.replayLogger.addAction(
        session.id,
        agentId,
        action,
        session.engine.getObserverView(),
      );
    } catch {
      // Non-critical
    }

    const newState = session.engine.getFullState();

    // Check if game ended
    if (newState.isFinished) {
      this.endSession(session);
      return true;
    }

    // Request next action
    this.requestNextAction(session);
    return true;
  }

  /** Request the next player to act */
  private requestNextAction(session: GameSession): void {
    const state = session.engine.getFullState();
    if (state.isFinished) {
      this.endSession(session);
      return;
    }

    const room = this.roomManager.getRoom(session.roomId);
    if (!room) return;

    const currentPlayerId = state.players[state.currentPlayerIndex]?.id;
    const currentPlayer = room.players.find(p => p.agentId === currentPlayerId);

    // Check if the current player is a bot (ws === null)
    if (currentPlayer && currentPlayer.ws === null) {
      // Bot auto-play — use LLM
      this.handleBotTurn(session, currentPlayer.agentId, currentPlayer.agentName);
      return;
    }

    // Notify: action request (for human/WebSocket players)
    this.onActionRequest?.(session.roomId, session);

    // Set action timeout
    const timeoutMs = room.config.actionTimeoutMs;
    session.actionTimer = setTimeout(() => {
      this.handleTimeout(session);
    }, timeoutMs);
  }

  /** Handle bot turn — call LLM to decide action */
  private async handleBotTurn(session: GameSession, botId: string, botName: string): Promise<void> {
    try {
      const playerView = session.engine.getPlayerView(botId);
      const legalActions = session.engine.getLegalActions(botId);

      if (!legalActions || legalActions.length === 0) {
        // No legal actions — use timeout
        const timeoutAction = session.engine.getTimeoutAction(botId);
        session.engine.applyAction(botId, timeoutAction);
      } else {
        // Extract model from bot name (format: "Kimi-K2.5" etc.)
        const model = (botName.includes('Qwen') ? 'qwen3.5-plus' :
                      botName.includes('Kimi') ? 'kimi-k2.5' :
                      botName.includes('MiniMax') ? 'MiniMax-M2.5' :
                      botName.includes('GLM') ? 'glm-5' : 'qwen3.5-plus') as LLMModel;

        const result = await llmBotDecide(
          session.gameType,
          playerView as Record<string, unknown>,
          legalActions as unknown[],
          model,
          botId,
        );

        // Log AI decision
        const state = session.engine.getFullState();
        this.aiLogger?.log({
          matchId: session.id,
          botId,
          model,
          gameType: session.gameType,
          round: state.round ?? undefined,
          phase: state.phase ?? undefined,
          systemPrompt: result.systemPrompt,
          userPrompt: result.userPrompt,
          rawResponse: result.rawResponse,
          parsedAction: result.parsedAction,
          usedFallback: result.usedFallback,
          latencyMs: result.latencyMs,
          error: result.error,
        });

        try {
          session.engine.applyAction(botId, result.action);
        } catch {
          // If LLM action invalid, fall back to timeout action
          const timeoutAction = session.engine.getTimeoutAction(botId);
          session.engine.applyAction(botId, timeoutAction);
        }
      }

      // Record replay
      try {
        this.replayLogger.addAction(
          session.id, botId,
          { type: 'bot_action' },
          session.engine.getObserverView(),
        );
      } catch { /* non-critical */ }

      // Broadcast state to human players
      this.onActionRequest?.(session.roomId, session);

      // Check if game ended
      const newState = session.engine.getFullState();
      if (newState.isFinished) {
        this.endSession(session);
      } else {
        // Small delay to pace bot actions
        setImmediate(() => this.requestNextAction(session));
      }
    } catch (err) {
      console.error(`[GameSession] Bot turn error for ${botId}:`, err);
      // Fallback: timeout action
      const timeoutAction = session.engine.getTimeoutAction(botId);
      session.engine.applyAction(botId, timeoutAction);
      const newState = session.engine.getFullState();
      if (newState.isFinished) {
        this.endSession(session);
      } else {
        setImmediate(() => this.requestNextAction(session));
      }
    }
  }

  /** Handle action timeout */
  private handleTimeout(session: GameSession): void {
    const state = session.engine.getFullState();
    const currentPlayer = state.players[state.currentPlayerIndex];

    // Execute timeout action (check if possible, else fold)
    const timeoutAction = session.engine.getTimeoutAction(currentPlayer.id);
    try {
      session.engine.applyAction(currentPlayer.id, timeoutAction);
    } catch (e: any) {
      console.error(`[GameSession] Timeout action failed for ${currentPlayer.id}:`, e.message);
      // If timeout action fails, try the first legal action as fallback
      const legalActions = session.engine.getLegalActions(currentPlayer.id);
      if (legalActions.length > 0) {
        session.engine.applyAction(currentPlayer.id, legalActions[0]);
      } else {
        return; // No legal actions, skip
      }
    }

    // Record replay: timeout action
    try {
      this.replayLogger.addAction(
        session.id,
        currentPlayer.id,
        { ...timeoutAction, _timeout: true },
        session.engine.getObserverView(),
      );
    } catch {
      // Non-critical
    }

    const newState = session.engine.getFullState();
    if (newState.isFinished) {
      this.endSession(session);
    } else {
      this.requestNextAction(session);
    }
  }

  /** End a game session */
  private endSession(session: GameSession): void {
    session.status = 'finished';
    if (session.actionTimer) {
      clearTimeout(session.actionTimer);
      session.actionTimer = null;
    }

    // Record replay: game end
    try {
      this.replayLogger.endMatch(
        session.id,
        session.engine.getObserverView(),
      );
    } catch {
      // Non-critical
    }

    this.onGameEnd?.(session.roomId, session);
    this.roomManager.finishRoom(session.roomId);
  }

  /** Get session by room ID */
  getSessionByRoom(roomId: string): GameSession | undefined {
    const sessionId = this.roomToSession.get(roomId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /** Get session by match ID */
  getSession(matchId: string): GameSession | undefined {
    return this.sessions.get(matchId);
  }
}
