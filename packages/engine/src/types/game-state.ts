// ============================================================
// Base game types — shared across all game plugins
// ============================================================

/** Base game state that all game-specific states must extend */
export interface GameState {
  /** Unique game type identifier */
  gameType: string;
  /** Current sequence / step number */
  sequenceId: number;
  /** Whether the game has ended */
  isFinished: boolean;
}

/** Base game action that all game-specific actions must extend */
export interface GameAction {
  /** The action type (game-specific) */
  type: string;
}

/** Game configuration passed to createInitialState */
export interface GameConfig {
  /** Game type */
  gameType: string;
  /** Player IDs */
  players: string[];
  /** Game-specific settings (override defaults) */
  settings?: Record<string, unknown>;
}

/** Filtered view for a specific player (information set) */
export interface PlayerView {
  /** Which player this view belongs to */
  playerId: string;
  /** Game type */
  gameType: string;
  /** Game state visible to this player */
  [key: string]: unknown;
}

/** Public view for observers (no private information) */
export interface ObserverView {
  /** Game type */
  gameType: string;
  /** Publicly visible game state */
  [key: string]: unknown;
}

/** Result of a completed game */
export interface GameResult {
  /** Winner player ID, or null for a draw */
  winnerId: string | null;
  /** Final scores / stacks for each player */
  finalScores: Record<string, number>;
  /** Total number of rounds / hands played */
  totalRounds: number;
}
