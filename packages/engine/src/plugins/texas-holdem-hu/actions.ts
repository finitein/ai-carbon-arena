// ============================================================
// Texas Hold'em Heads-Up — Action types
// ============================================================

import type { GameAction } from '../../types/game-state';

export type TexasHoldemAction =
  | FoldAction
  | CheckAction
  | CallAction
  | BetAction
  | RaiseAction;

export interface FoldAction extends GameAction {
  type: 'fold';
}

export interface CheckAction extends GameAction {
  type: 'check';
}

export interface CallAction extends GameAction {
  type: 'call';
}

export interface BetAction extends GameAction {
  type: 'bet';
  amount: number;
}

export interface RaiseAction extends GameAction {
  type: 'raise';
  amount: number;
}

/** Helper to create typed actions */
export const Actions = {
  fold: (): FoldAction => ({ type: 'fold' }),
  check: (): CheckAction => ({ type: 'check' }),
  call: (): CallAction => ({ type: 'call' }),
  bet: (amount: number): BetAction => ({ type: 'bet', amount }),
  raise: (amount: number): RaiseAction => ({ type: 'raise', amount }),
} as const;
