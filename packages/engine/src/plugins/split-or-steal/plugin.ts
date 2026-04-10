// ============================================================
// Split or Steal Plugin — based on Golden Balls TV show
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';

export interface SoSState {
  gameType: 'split_or_steal';
  sequenceId: number;
  isFinished: boolean;
  players: [SoSPlayer, SoSPlayer];
  /** Jackpot — the prize pool */
  jackpot: number;
  /** Phase: 'negotiate' (messaging phase), 'decide' (final choice), 'reveal', 'end' */
  phase: 'negotiate' | 'decide' | 'reveal' | 'end';
  /** Messages exchanged during negotiation */
  messages: SoSMessage[];
  /** Pending decisions (null = not yet submitted) */
  pendingDecisions: [SoSDecision | null, SoSDecision | null];
  currentPlayerIndex: number;
  /** Maximum negotiation messages allowed */
  maxMessages: number;
  messageCount: number;
  /** Result after reveal */
  result: SoSResult | null;
}

export interface SoSPlayer {
  id: string;
  payout: number;
}

export type SoSDecision = 'split' | 'steal';

export interface SoSMessage {
  playerId: string;
  text: string;
}

export interface SoSResult {
  decisions: [SoSDecision, SoSDecision];
  payouts: [number, number];
  outcome: 'both_split' | 'one_steals' | 'both_steal';
}

export type SoSAction =
  | { type: 'message'; text: string }
  | { type: 'end_negotiate' }
  | { type: 'split' }
  | { type: 'steal' };

export class SplitOrStealPlugin implements GamePlugin<SoSState, SoSAction> {
  readonly gameType = 'split_or_steal';

  createInitialState(config: GameConfig): SoSState {
    const settings = config.settings as { jackpot?: number; maxMessages?: number } | undefined;
    return {
      gameType: 'split_or_steal',
      sequenceId: 0,
      isFinished: false,
      players: [
        { id: config.players[0], payout: 0 },
        { id: config.players[1], payout: 0 },
      ],
      jackpot: settings?.jackpot || 10000,
      phase: 'negotiate',
      messages: [],
      pendingDecisions: [null, null],
      currentPlayerIndex: 0,
      maxMessages: settings?.maxMessages || 6,
      messageCount: 0,
      result: null,
    };
  }

  applyAction(state: SoSState, action: SoSAction): SoSState {
    const newState = JSON.parse(JSON.stringify(state)) as SoSState;
    newState.sequenceId++;

    const playerIdx = newState.currentPlayerIndex;

    switch (action.type) {
      case 'message': {
        if (newState.phase !== 'negotiate') break;
        newState.messages.push({ playerId: newState.players[playerIdx].id, text: action.text });
        newState.messageCount++;
        newState.currentPlayerIndex = 1 - playerIdx;

        // Auto-advance to decision phase if max messages reached
        if (newState.messageCount >= newState.maxMessages) {
          newState.phase = 'decide';
          newState.currentPlayerIndex = 0;
        }
        break;
      }

      case 'end_negotiate': {
        newState.phase = 'decide';
        newState.currentPlayerIndex = 0;
        break;
      }

      case 'split':
      case 'steal': {
        if (newState.phase !== 'decide') break;
        newState.pendingDecisions[playerIdx] = action.type;

        // If both decided, resolve
        if (newState.pendingDecisions[0] !== null && newState.pendingDecisions[1] !== null) {
          const d0 = newState.pendingDecisions[0]!;
          const d1 = newState.pendingDecisions[1]!;

          let payouts: [number, number];
          let outcome: SoSResult['outcome'];

          if (d0 === 'split' && d1 === 'split') {
            payouts = [newState.jackpot / 2, newState.jackpot / 2];
            outcome = 'both_split';
          } else if (d0 === 'steal' && d1 === 'steal') {
            payouts = [0, 0];
            outcome = 'both_steal';
          } else {
            // One steals — stealer takes all
            payouts = d0 === 'steal' ? [newState.jackpot, 0] : [0, newState.jackpot];
            outcome = 'one_steals';
          }

          newState.players[0].payout = payouts[0];
          newState.players[1].payout = payouts[1];
          newState.result = { decisions: [d0, d1], payouts, outcome };
          newState.phase = 'end';
          newState.isFinished = true;
        } else {
          newState.currentPlayerIndex = 1 - playerIdx;
        }
        break;
      }
    }

    return newState;
  }

  getLegalActions(state: SoSState, playerId: string): SoSAction[] {
    const pIdx = state.players.findIndex(p => p.id === playerId);
    if (pIdx !== state.currentPlayerIndex && playerId !== '') return [];
    if (state.phase === 'negotiate') {
      return [
        { type: 'message', text: '' },
        { type: 'end_negotiate' },
      ];
    }
    if (state.phase === 'decide') {
      return [{ type: 'split' }, { type: 'steal' }];
    }
    return [];
  }

  getPlayerView(state: SoSState, playerId: string): PlayerView {
    const playerIdx = state.players.findIndex(p => p.id === playerId);
    return {
      playerId,
      gameType: 'split_or_steal',
      jackpot: state.jackpot,
      phase: state.phase,
      messages: state.messages,
      yourPayout: state.players[playerIdx].payout,
      result: state.result,
      isFinished: state.isFinished,
    };
  }

  getObserverView(state: SoSState): ObserverView {
    return {
      gameType: 'split_or_steal',
      jackpot: state.jackpot,
      phase: state.phase,
      messages: state.messages,
      result: state.result,
      isFinished: state.isFinished,
    };
  }

  isTerminal(state: SoSState): boolean {
    return state.isFinished;
  }

  getTimeoutAction(state: SoSState): SoSAction {
    return state.phase === 'negotiate' ? { type: 'end_negotiate' } : { type: 'split' };
  }
}
