// ============================================================
// EngineCore — manages game lifecycle via a GamePlugin
// ============================================================

import type { GamePlugin } from '../types/game-plugin';
import type { GameState, GameAction, GameConfig, PlayerView, ObserverView } from '../types/game-state';

/**
 * EngineCore orchestrates a game session using a GamePlugin.
 * It manages state, validates and applies actions, and provides
 * snapshot/restore for deterministic replay.
 */
export class EngineCore<S extends GameState, A extends GameAction> {
  private state: S;
  private readonly plugin: GamePlugin<S, A>;
  private readonly actionLog: Array<{ playerId: string; action: A; stateAfter: S }> = [];

  constructor(plugin: GamePlugin<S, A>, config: GameConfig, rngSeed: number) {
    this.plugin = plugin;
    this.state = plugin.createInitialState(config, rngSeed);
  }

  /** Get the current full game state (internal use only — never send to players) */
  getFullState(): S {
    return this.state;
  }

  /** Get the filtered view for a specific player (information set) */
  getPlayerView(playerId: string): PlayerView {
    return this.plugin.getPlayerView(this.state, playerId);
  }

  /** Get the observer view (public information only) */
  getObserverView(): ObserverView {
    return this.plugin.getObserverView(this.state);
  }

  /** Get legal actions for a player */
  getLegalActions(playerId: string): A[] {
    return this.plugin.getLegalActions(this.state, playerId);
  }

  /** Check if the game is finished */
  isTerminal(): boolean {
    return this.plugin.isTerminal(this.state);
  }

  /** Get the timeout fallback action for a player */
  getTimeoutAction(playerId: string): A {
    return this.plugin.getTimeoutAction(this.state, playerId);
  }

  /**
   * Apply a validated action. Returns the new state.
   * Throws if the action is not legal.
   */
  applyAction(playerId: string, action: A): S {
    // Validate the action is legal
    const legalActions = this.plugin.getLegalActions(this.state, playerId);
    const isLegal = legalActions.some((legal) => {
      const legalRecord = legal as Record<string, unknown>;
      const actionRecord = action as Record<string, unknown>;
      if (legalRecord.type !== actionRecord.type) return false;
      for (const key of Object.keys(legal)) {
        const legalVal = legalRecord[key];
        const actionVal = actionRecord[key];
        if (typeof legalVal === 'string' && legalVal === '') {
          if (actionVal !== undefined && typeof actionVal !== 'string') return false;
        } else if (JSON.stringify(legalVal) !== JSON.stringify(actionVal)) {
          return false;
        }
      }
      return true;
    });

    if (!isLegal) {
      throw new Error(
        `Illegal action: ${JSON.stringify(action)} is not in legal actions: ${JSON.stringify(legalActions)}`,
      );
    }

    // Apply the action (pure function — returns new state)
    this.state = this.plugin.applyAction(this.state, action);
    this.actionLog.push({ playerId, action, stateAfter: this.state });

    return this.state;
  }

  /** Get the complete action log for replay / JSONL writing */
  getActionLog(): ReadonlyArray<{ playerId: string; action: A; stateAfter: S }> {
    return this.actionLog;
  }

  /** Get game type identifier */
  getGameType(): string {
    return this.plugin.gameType;
  }

  /** Snapshot current state (serializable) */
  snapshot(): string {
    return JSON.stringify(this.state);
  }

  /** Restore state from a snapshot */
  restore(snapshot: string): void {
    this.state = JSON.parse(snapshot) as S;
  }
}
