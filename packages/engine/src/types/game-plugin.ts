// ============================================================
// GamePlugin — the core interface all game implementations must satisfy
// ============================================================

import type { GameState, GameAction, GameConfig, PlayerView, ObserverView } from './game-state';

/**
 * A game plugin encapsulates all rules for a specific game type.
 * Every method must be a **pure function** (deterministic, no side effects).
 */
export interface GamePlugin<
  S extends GameState = GameState,
  A extends GameAction = GameAction,
> {
  /** Unique identifier for this game type, e.g. 'texas_holdem_hu' */
  readonly gameType: string;

  /**
   * Pure function: apply an action to the current state and return a new state.
   * Must be deterministic: same (state, action) always produces the same result.
   */
  applyAction(state: S, action: A): S;

  /**
   * Return the list of legal actions for a given player in the current state.
   */
  getLegalActions(state: S, playerId: string): A[];

  /**
   * Information set filtering: return only the information visible to a specific player.
   */
  getPlayerView(state: S, playerId: string): PlayerView;

  /**
   * Observer view: return publicaly visible information (no hole cards).
   */
  getObserverView(state: S): ObserverView;

  /**
   * Check whether the game has reached a terminal state.
   */
  isTerminal(state: S): boolean;

  /**
   * Timeout fallback: return the default action to execute when a player times out.
   * Rule: Check if possible, otherwise Fold.
   */
  getTimeoutAction(state: S, playerId: string): A;

  /**
   * Create the initial game state from a config and a deterministic RNG seed.
   */
  createInitialState(config: GameConfig, rngSeed: number): S;
}
