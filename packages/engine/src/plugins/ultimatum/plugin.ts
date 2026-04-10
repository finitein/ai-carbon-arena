// ============================================================
// Ultimatum Game Plugin — fairness & social reasoning
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';

export interface UltimatumState {
  gameType: 'ultimatum';
  sequenceId: number;
  isFinished: boolean;
  players: [UltPlayer, UltPlayer];
  /** Which round: 1 = player0 proposes, 2 = player1 proposes */
  round: number;
  totalRounds: 2;
  totalAmount: number;
  phase: 'propose' | 'respond' | 'round_end' | 'game_over';
  currentProposerIndex: number;
  proposal: { proposerShare: number; responderShare: number } | null;
  result: { accepted: boolean; proposerGain: number; responderGain: number } | null;
  currentPlayerIndex: number;
}

export interface UltPlayer {
  id: string;
  score: number;
}

export type UltimatumAction =
  | { type: 'propose'; myShare: number }
  | { type: 'accept' }
  | { type: 'reject' };

export class UltimatumPlugin implements GamePlugin<UltimatumState, UltimatumAction> {
  readonly gameType = 'ultimatum';

  createInitialState(config: GameConfig): UltimatumState {
    const totalAmount = (config.settings as { totalAmount?: number } | undefined)?.totalAmount || 100;
    return {
      gameType: 'ultimatum',
      sequenceId: 0,
      isFinished: false,
      players: [
        { id: config.players[0], score: 0 },
        { id: config.players[1], score: 0 },
      ],
      round: 1,
      totalRounds: 2,
      totalAmount,
      phase: 'propose',
      currentProposerIndex: 0,
      proposal: null,
      result: null,
      currentPlayerIndex: 0,
    };
  }

  applyAction(state: UltimatumState, action: UltimatumAction): UltimatumState {
    const s = JSON.parse(JSON.stringify(state)) as UltimatumState;
    s.sequenceId++;

    if (action.type === 'propose') {
      const myShare = Math.max(0, Math.min(s.totalAmount, action.myShare));
      s.proposal = { proposerShare: myShare, responderShare: s.totalAmount - myShare };
      s.phase = 'respond';
      s.currentPlayerIndex = 1 - s.currentProposerIndex;
      return s;
    }

    if (action.type === 'accept') {
      s.players[s.currentProposerIndex].score += s.proposal!.proposerShare;
      s.players[1 - s.currentProposerIndex].score += s.proposal!.responderShare;
      s.result = { accepted: true, proposerGain: s.proposal!.proposerShare, responderGain: s.proposal!.responderShare };
    } else {
      s.result = { accepted: false, proposerGain: 0, responderGain: 0 };
    }

    if (s.round >= 2) {
      s.isFinished = true;
      s.phase = 'game_over';
    } else {
      s.round = 2;
      s.currentProposerIndex = 1;
      s.currentPlayerIndex = 1;
      s.phase = 'propose';
      s.proposal = null;
      s.result = null;
    }

    return s;
  }

  getLegalActions(state: UltimatumState, _playerId: string): UltimatumAction[] {
    if (state.phase === 'propose') {
      return [{ type: 'propose' } as any];
    }
    if (state.phase === 'respond') {
      return [{ type: 'accept' }, { type: 'reject' }];
    }
    return [];
  }

  getPlayerView(state: UltimatumState, playerId: string): PlayerView {
    const idx = state.players.findIndex(p => p.id === playerId);
    const isProposer = idx === state.currentProposerIndex;
    return {
      playerId, gameType: 'ultimatum', round: state.round, role: isProposer ? 'proposer' : 'responder',
      totalAmount: state.totalAmount, proposal: state.proposal, result: state.result,
      yourScore: state.players[idx].score, opponentScore: state.players[1 - idx].score,
      isFinished: state.isFinished,
    };
  }

  getObserverView(state: UltimatumState): ObserverView {
    return {
      gameType: 'ultimatum', round: state.round, totalAmount: state.totalAmount,
      proposal: state.proposal, result: state.result,
      scores: [state.players[0].score, state.players[1].score], isFinished: state.isFinished,
    };
  }

  isTerminal(state: UltimatumState): boolean { return state.isFinished; }
  getTimeoutAction(state: UltimatumState): UltimatumAction {
    return state.phase === 'propose' ? { type: 'propose', myShare: 50 } : { type: 'accept' };
  }
}
