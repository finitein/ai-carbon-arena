// ============================================================
// Replay Logger — records per-action state snapshots for playback
// ============================================================

export interface ReplayEvent {
  seq: number;
  timestamp: string;
  type: 'game_start' | 'action' | 'hand_result' | 'game_end';
  playerId?: string;
  action?: unknown;
  state: unknown; // Observer view of game state
}

export interface MatchReplay {
  matchId: string;
  gameType: string;
  players: { id: string; name: string }[];
  startedAt: string;
  endedAt?: string;
  events: ReplayEvent[];
}

export class ReplayLogger {
  private replays: Map<string, MatchReplay> = new Map();

  /** Start recording a new match */
  startMatch(
    matchId: string,
    gameType: string,
    players: { id: string; name: string }[],
    initialState: unknown,
  ): void {
    this.replays.set(matchId, {
      matchId,
      gameType,
      players,
      startedAt: new Date().toISOString(),
      events: [
        {
          seq: 0,
          timestamp: new Date().toISOString(),
          type: 'game_start',
          state: initialState,
        },
      ],
    });
  }

  /** Record an action event */
  addAction(
    matchId: string,
    playerId: string,
    action: unknown,
    stateAfter: unknown,
  ): void {
    const replay = this.replays.get(matchId);
    if (!replay) return;

    replay.events.push({
      seq: replay.events.length,
      timestamp: new Date().toISOString(),
      type: 'action',
      playerId,
      action,
      state: stateAfter,
    });
  }

  /** Record a hand result (for multi-hand games like poker) */
  addHandResult(matchId: string, state: unknown): void {
    const replay = this.replays.get(matchId);
    if (!replay) return;

    replay.events.push({
      seq: replay.events.length,
      timestamp: new Date().toISOString(),
      type: 'hand_result',
      state,
    });
  }

  /** Finalize a match recording */
  endMatch(matchId: string, finalState: unknown): void {
    const replay = this.replays.get(matchId);
    if (!replay) return;

    replay.endedAt = new Date().toISOString();
    replay.events.push({
      seq: replay.events.length,
      timestamp: new Date().toISOString(),
      type: 'game_end',
      state: finalState,
    });
  }

  /** Get replay data for a match */
  getReplay(matchId: string): MatchReplay | undefined {
    return this.replays.get(matchId);
  }

  /** Get all stored replay IDs */
  getReplayIds(): string[] {
    return [...this.replays.keys()];
  }

  /** Delete old replays to free memory (keep last N) */
  cleanup(keepLast: number = 100): void {
    const ids = [...this.replays.keys()];
    if (ids.length <= keepLast) return;

    const toDelete = ids.slice(0, ids.length - keepLast);
    for (const id of toDelete) {
      this.replays.delete(id);
    }
  }
}
