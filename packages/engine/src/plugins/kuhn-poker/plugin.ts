// ============================================================
// Kuhn Poker Plugin — minimal poker for bluffing tests
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';
import { DeterministicRNG } from '../../core/rng';

export type KuhnCard = 'J' | 'Q' | 'K';

export interface KuhnPokerState {
  gameType: 'kuhn_poker';
  sequenceId: number;
  isFinished: boolean;
  players: [KuhnPlayer, KuhnPlayer];
  currentPlayerIndex: number;
  pot: number;
  bettingHistory: ('check' | 'bet' | 'call' | 'fold')[];
  phase: 'player1_action' | 'player2_action' | 'showdown' | 'hand_over';
  handNum: number;
  totalHands: number;
  rngState: [number, number, number, number];
  handResult: { winnerId: string | null; pot: number } | null;
}

export interface KuhnPlayer {
  id: string;
  card: KuhnCard | null;
  score: number;
}

export type KuhnPokerAction =
  | { type: 'check' }
  | { type: 'bet' }
  | { type: 'call' }
  | { type: 'fold' };

const CARD_RANK: Record<KuhnCard, number> = { J: 1, Q: 2, K: 3 };

export class KuhnPokerPlugin implements GamePlugin<KuhnPokerState, KuhnPokerAction> {
  readonly gameType = 'kuhn_poker';

  createInitialState(config: GameConfig, rngSeed: number): KuhnPokerState {
    const totalHands = (config.settings as { hands?: number } | undefined)?.hands || 5;
    const rng = new DeterministicRNG(rngSeed);

    const state: KuhnPokerState = {
      gameType: 'kuhn_poker',
      sequenceId: 0,
      isFinished: false,
      players: [
        { id: config.players[0], card: null, score: 0 },
        { id: config.players[1], card: null, score: 0 },
      ],
      currentPlayerIndex: 0,
      pot: 0,
      bettingHistory: [],
      phase: 'player1_action',
      handNum: 0,
      totalHands,
      rngState: rng.getState(),
      handResult: null,
    };

    return this.dealNewHand(state);
  }

  applyAction(state: KuhnPokerState, action: KuhnPokerAction): KuhnPokerState {
    const s = JSON.parse(JSON.stringify(state)) as KuhnPokerState;
    s.sequenceId++;
    s.bettingHistory.push(action.type);

    const history = s.bettingHistory;

    if (action.type === 'fold') {
      const winnerId = s.players[1 - s.currentPlayerIndex].id;
      s.handResult = { winnerId, pot: s.pot };
      return this.resolveHand(s);
    }

    if (action.type === 'bet') {
      s.pot += 1;
      s.currentPlayerIndex = 1 - s.currentPlayerIndex;
      s.phase = s.currentPlayerIndex === 0 ? 'player1_action' : 'player2_action';
      return s;
    }

    if (action.type === 'call') {
      s.pot += 1;
      // Showdown
      return this.showdown(s);
    }

    if (action.type === 'check') {
      if (history.length === 1) {
        // P1 checks, P2's turn
        s.currentPlayerIndex = 1;
        s.phase = 'player2_action';
      } else if (history.length === 2 && history[0] === 'check') {
        // Both checked → showdown
        return this.showdown(s);
      }
      return s;
    }

    return s;
  }

  getLegalActions(state: KuhnPokerState, playerId: string): KuhnPokerAction[] {
    if (state.phase === 'showdown' || state.phase === 'hand_over' || state.isFinished) return [];
    const pIdx = state.players.findIndex(p => p.id === playerId);
    if (pIdx !== state.currentPlayerIndex && playerId !== '') return [];
    const h = state.bettingHistory;

    if (h.length === 0) {
      return [{ type: 'check' }, { type: 'bet' }];
    }
    const last = h[h.length - 1];
    if (last === 'bet') {
      return [{ type: 'fold' }, { type: 'call' }];
    }
    if (last === 'check') {
      return [{ type: 'check' }, { type: 'bet' }];
    }
    return [];
  }

  getPlayerView(state: KuhnPokerState, playerId: string): PlayerView {
    const idx = state.players.findIndex(p => p.id === playerId);
    return {
      playerId,
      gameType: 'kuhn_poker',
      yourCard: state.players[idx].card,
      pot: state.pot,
      bettingHistory: state.bettingHistory,
      handNum: state.handNum,
      totalHands: state.totalHands,
      yourScore: state.players[idx].score,
      opponentScore: state.players[1 - idx].score,
      handResult: state.handResult,
      isFinished: state.isFinished,
    };
  }

  getObserverView(state: KuhnPokerState): ObserverView {
    return {
      gameType: 'kuhn_poker',
      pot: state.pot,
      bettingHistory: state.bettingHistory,
      handNum: state.handNum,
      scores: [state.players[0].score, state.players[1].score],
      isFinished: state.isFinished,
    };
  }

  isTerminal(state: KuhnPokerState): boolean { return state.isFinished; }
  getTimeoutAction(state: KuhnPokerState): KuhnPokerAction {
    const legal = this.getLegalActions(state, '');
    return legal.find(a => a.type === 'check') || { type: 'fold' };
  }

  private showdown(state: KuhnPokerState): KuhnPokerState {
    const s = JSON.parse(JSON.stringify(state)) as KuhnPokerState;
    const r0 = CARD_RANK[s.players[0].card!];
    const r1 = CARD_RANK[s.players[1].card!];
    const winnerId = r0 > r1 ? s.players[0].id : s.players[1].id;
    s.handResult = { winnerId, pot: s.pot };
    return this.resolveHand(s);
  }

  private resolveHand(state: KuhnPokerState): KuhnPokerState {
    const s = JSON.parse(JSON.stringify(state)) as KuhnPokerState;
    if (s.handResult?.winnerId) {
      const idx = s.players.findIndex(p => p.id === s.handResult!.winnerId);
      s.players[idx].score += s.pot;
    }

    if (s.handNum >= s.totalHands) {
      s.isFinished = true;
      s.phase = 'hand_over';
      return s;
    }

    return this.dealNewHand(s);
  }

  private dealNewHand(state: KuhnPokerState): KuhnPokerState {
    const s = JSON.parse(JSON.stringify(state)) as KuhnPokerState;
    s.handNum++;
    s.handResult = null;
    s.bettingHistory = [];
    s.pot = 2; // Each antes 1
    s.currentPlayerIndex = (s.handNum - 1) % 2; // Alternate first player
    s.phase = s.currentPlayerIndex === 0 ? 'player1_action' : 'player2_action';

    const rng = new DeterministicRNG(0);
    rng.setState(s.rngState);
    const deck: KuhnCard[] = rng.shuffle(['J', 'Q', 'K']) as KuhnCard[];
    s.players[0].card = deck[0];
    s.players[1].card = deck[1];
    s.rngState = rng.getState();
    return s;
  }
}
