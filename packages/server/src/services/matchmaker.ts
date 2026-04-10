// ============================================================
// Matchmaker — Rating-based matching with LLM bot filling
// ============================================================

import type { RoomManager, RoomPlayer } from './room-manager';
import { getRequiredPlayers } from './room-manager';
import type { GameSessionManager } from './game-session';
import { randomModel, getLLMBotName, LLM_MODELS } from '../bots/llm-bot';

interface QueueEntry {
  player: RoomPlayer;
  gameType: string;
  joinedAt: number;
  ratingRange: number;
}

export class Matchmaker {
  private queue: QueueEntry[] = [];
  private readonly roomManager: RoomManager;
  private readonly gameSessionManager: GameSessionManager;
  private matchInterval: ReturnType<typeof setInterval> | null = null;

  // Config
  private readonly INITIAL_RATING_RANGE = 200;
  private readonly RATING_RANGE_EXPANSION_PER_SEC = 10;
  private readonly MAX_WAIT_MS = 60000; // 60 seconds before bot fallback (2p games)
  private readonly MULTIPLAYER_WAIT_MS = 5000; // 5 seconds for multiplayer then fill with AI
  private readonly TICK_MS = 2000;

  constructor(roomManager: RoomManager, gameSessionManager: GameSessionManager) {
    this.roomManager = roomManager;
    this.gameSessionManager = gameSessionManager;
  }

  /** Start the matchmaking loop */
  start(): void {
    if (this.matchInterval) return;
    this.matchInterval = setInterval(() => this.tick(), this.TICK_MS);
  }

  /** Stop the matchmaking loop */
  stop(): void {
    if (this.matchInterval) {
      clearInterval(this.matchInterval);
      this.matchInterval = null;
    }
  }

  /** Add a player to the queue */
  enqueue(player: RoomPlayer, gameType: string): void {
    if (this.queue.some((e) => e.player.agentId === player.agentId)) {
      return;
    }
    this.queue.push({
      player,
      gameType,
      joinedAt: Date.now(),
      ratingRange: this.INITIAL_RATING_RANGE,
    });
  }

  /** Remove a player from the queue */
  dequeue(agentId: string): void {
    this.queue = this.queue.filter((e) => e.player.agentId !== agentId);
  }

  /** Get queue position for a player */
  getQueuePosition(agentId: string): number {
    const idx = this.queue.findIndex((e) => e.player.agentId === agentId);
    return idx === -1 ? -1 : idx + 1;
  }

  /** Check if a player is in queue */
  isInQueue(agentId: string): boolean {
    return this.queue.some((e) => e.player.agentId === agentId);
  }

  /** Matchmaking tick — try to pair players */
  private tick(): void {
    const now = Date.now();

    // Expand rating ranges for waiting players
    for (const entry of this.queue) {
      const waitSec = (now - entry.joinedAt) / 1000;
      entry.ratingRange = this.INITIAL_RATING_RANGE + waitSec * this.RATING_RANGE_EXPANSION_PER_SEC;
    }

    const requiredCounts = new Map<string, number>();
    
    // Group queue entries by game type
    const byGameType = new Map<string, QueueEntry[]>();
    for (const entry of this.queue) {
      if (!byGameType.has(entry.gameType)) byGameType.set(entry.gameType, []);
      byGameType.get(entry.gameType)!.push(entry);
      if (!requiredCounts.has(entry.gameType)) {
        requiredCounts.set(entry.gameType, getRequiredPlayers(entry.gameType));
      }
    }

    const matched = new Set<string>();

    for (const [gameType, entries] of byGameType) {
      const required = requiredCounts.get(gameType)!;

      if (required === 2) {
        // 2-player matching: try to pair, timeout → fill with AI
        this.matchTwoPlayer(entries, now, matched);
      } else {
        // Multiplayer: short wait then fill remaining seats with AI
        this.matchMultiPlayer(entries, gameType, required, now, matched);
      }
    }

    // Remove matched players from queue
    this.queue = this.queue.filter((e) => !matched.has(e.player.agentId));
  }

  /** 2-player matching with 60s timeout */
  private matchTwoPlayer(entries: QueueEntry[], now: number, matched: Set<string>): void {
    // Try to find human vs human matches
    for (let i = 0; i < entries.length; i++) {
      if (matched.has(entries[i].player.agentId)) continue;
      const entryA = entries[i];

      for (let j = i + 1; j < entries.length; j++) {
        if (matched.has(entries[j].player.agentId)) continue;
        const entryB = entries[j];

        const ratingDiff = Math.abs(entryA.player.rating - entryB.player.rating);
        const acceptableRange = Math.min(entryA.ratingRange, entryB.ratingRange);

        if (ratingDiff <= acceptableRange) {
          this.createMatch([entryA.player, entryB.player], entryA.gameType);
          matched.add(entryA.player.agentId);
          matched.add(entryB.player.agentId);
          break;
        }
      }
    }

    // Handle timeout — fill with AI bot after MAX_WAIT_MS
    for (const entry of entries) {
      if (matched.has(entry.player.agentId)) continue;
      const waitMs = now - entry.joinedAt;
      if (waitMs >= this.MAX_WAIT_MS) {
        this.fillWithAI(entry, 2);
        matched.add(entry.player.agentId);
      }
    }
  }

  /** Multiplayer matching: wait briefly then fill with AI */
  private matchMultiPlayer(
    entries: QueueEntry[], gameType: string,
    required: number, now: number, matched: Set<string>,
  ): void {
    // For each waiting player, after a short delay, fill remaining seats with AI
    for (const entry of entries) {
      if (matched.has(entry.player.agentId)) continue;
      const waitMs = now - entry.joinedAt;
      if (waitMs >= this.MULTIPLAYER_WAIT_MS) {
        this.fillWithAI(entry, required);
        matched.add(entry.player.agentId);
      }
    }
  }

  /** Fill a room with AI bots and start the game */
  private fillWithAI(humanEntry: QueueEntry, totalPlayers: number): void {
    const room = this.roomManager.createRoom(humanEntry.gameType, 'ranked');
    this.roomManager.joinRoom(room.id, humanEntry.player);

    // Create AI bot players for remaining seats
    const usedModels: string[] = [];
    for (let i = 1; i < totalPlayers; i++) {
      // Rotate through all 4 models, then repeat
      const model = LLM_MODELS[(i - 1) % LLM_MODELS.length];
      usedModels.push(model);

      const botPlayer: RoomPlayer = {
        agentId: `llm_${model}_${Date.now()}_${i}`,
        agentName: getLLMBotName(model),
        rating: 1500,
        ws: null, // Bot has no WebSocket — game-session detects this
        sessionId: `bot_session_${Date.now()}_${i}`,
      };

      this.roomManager.joinRoom(room.id, botPlayer);
    }

    console.log(`[Matchmaker] Filled room with ${totalPlayers - 1} AI bots: ${usedModels.join(', ')}`);

    // Start the game session
    this.gameSessionManager.startSession(room.id, humanEntry.gameType);
  }

  /** Create a match between paired players */
  private createMatch(players: RoomPlayer[], gameType: string): void {
    const room = this.roomManager.createRoom(gameType, 'ranked');
    for (const player of players) {
      this.roomManager.joinRoom(room.id, player);
    }
    this.gameSessionManager.startSession(room.id, gameType);
  }
}
