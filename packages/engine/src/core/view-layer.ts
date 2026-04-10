// ============================================================
// ViewLayer — information set filtering
// ============================================================

import type { GamePlugin } from '../types/game-plugin';
import type { GameState, GameAction, PlayerView, ObserverView } from '../types/game-state';

/**
 * ViewLayer provides architecture-level information isolation.
 * It ensures players only receive the information they are allowed to see.
 */
export class ViewLayer<S extends GameState, A extends GameAction> {
  private readonly plugin: GamePlugin<S, A>;

  constructor(plugin: GamePlugin<S, A>) {
    this.plugin = plugin;
  }

  /** Filter state for a specific player — hides opponent's private info */
  filterForPlayer(fullState: S, playerId: string): PlayerView {
    return this.plugin.getPlayerView(fullState, playerId);
  }

  /** Filter state for observers — public information only */
  filterForObserver(fullState: S): ObserverView {
    return this.plugin.getObserverView(fullState);
  }

  /** God view — returns full state (for replay, v0.2) */
  filterForGodView(fullState: S): S {
    return fullState;
  }
}
