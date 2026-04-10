// ============================================================
// Prisoner's Dilemma Plugin — simultaneous move game
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';

/** Prison's Dilemma State */
export interface PDState {
  gameType: 'prisoners_dilemma';
  sequenceId: number;
  isFinished: boolean;
  players: [PDPlayer, PDPlayer];
  totalRounds: number;
  currentRound: number;
  /**
   * Phase: 'choose' (both players pick), 'reveal' (both revealed), 'end'
   */
  phase: 'choose' | 'reveal' | 'end';
  /** History of moves and outcomes */
  history: PDRoundResult[];
  /** Pending moves for current round (null = not yet submitted) */
  pendingMoves: [PDMove | null, PDMove | null];
  /** Which player needs to submit (alternates for fairness in sequential sim) */
  currentPlayerIndex: number;
}

export interface PDPlayer {
  id: string;
  score: number;
}

export type PDMove = 'cooperate' | 'defect';

export interface PDRoundResult {
  round: number;
  moves: [PDMove, PDMove];
  scores: [number, number];
}

export interface PDAction {
  type: 'cooperate' | 'defect';
}

/** Payoff matrix: [myMove][theirMove] => myScore */
const PAYOFF: Record<PDMove, Record<PDMove, number>> = {
  cooperate: { cooperate: 3, defect: 0 },
  defect: { cooperate: 5, defect: 1 },
};

export class PrisonersDilemmaPlugin implements GamePlugin<PDState, PDAction> {
  readonly gameType = 'prisoners_dilemma';

  createInitialState(config: GameConfig): PDState {
    const totalRounds = (config.settings as { rounds?: number } | undefined)?.rounds || 10;

    return {
      gameType: 'prisoners_dilemma',
      sequenceId: 0,
      isFinished: false,
      players: [
        { id: config.players[0], score: 0 },
        { id: config.players[1], score: 0 },
      ],
      totalRounds,
      currentRound: 1,
      phase: 'choose',
      history: [],
      pendingMoves: [null, null],
      currentPlayerIndex: 0,
    };
  }

  applyAction(state: PDState, action: PDAction): PDState {
    const newState = JSON.parse(JSON.stringify(state)) as PDState;
    newState.sequenceId++;

    const playerIdx = newState.currentPlayerIndex;
    newState.pendingMoves[playerIdx] = action.type;

    // If both have chosen, resolve round
    if (newState.pendingMoves[0] !== null && newState.pendingMoves[1] !== null) {
      const m0 = newState.pendingMoves[0]!;
      const m1 = newState.pendingMoves[1]!;
      const s0 = PAYOFF[m0][m1];
      const s1 = PAYOFF[m1][m0];

      newState.players[0].score += s0;
      newState.players[1].score += s1;

      newState.history.push({
        round: newState.currentRound,
        moves: [m0, m1],
        scores: [s0, s1],
      });

      newState.phase = 'reveal';

      // Advance to next round
      if (newState.currentRound >= newState.totalRounds) {
        newState.isFinished = true;
        newState.phase = 'end';
      } else {
        newState.currentRound++;
        newState.pendingMoves = [null, null];
        newState.phase = 'choose';
        newState.currentPlayerIndex = 0;
      }
    } else {
      // Switch to the other player
      newState.currentPlayerIndex = 1 - playerIdx;
    }

    return newState;
  }

  getLegalActions(state: PDState, playerId: string): PDAction[] {
    const pIdx = state.players.findIndex(p => p.id === playerId);
    if (pIdx !== state.currentPlayerIndex && playerId !== '') return [];
    return [{ type: 'cooperate' }, { type: 'defect' }];
  }

  getPlayerView(state: PDState, playerId: string): PlayerView {
    const playerIdx = state.players.findIndex(p => p.id === playerId);
    return {
      playerId,
      gameType: 'prisoners_dilemma',
      round: state.currentRound,
      totalRounds: state.totalRounds,
      yourScore: state.players[playerIdx].score,
      opponentScore: state.players[1 - playerIdx].score,
      history: state.history,
      phase: state.phase,
      isFinished: state.isFinished,
    };
  }

  getObserverView(state: PDState): ObserverView {
    return {
      gameType: 'prisoners_dilemma',
      round: state.currentRound,
      totalRounds: state.totalRounds,
      scores: [state.players[0].score, state.players[1].score],
      history: state.history,
      phase: state.phase,
      isFinished: state.isFinished,
    };
  }

  isTerminal(state: PDState): boolean {
    return state.isFinished;
  }

  getTimeoutAction(): PDAction {
    return { type: 'cooperate' }; // Default to cooperate
  }
}
