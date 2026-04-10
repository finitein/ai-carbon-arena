// ============================================================
// Liar's Auction Plugin — information asymmetry + social deception
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';
import { DeterministicRNG } from '../../core/rng';

export interface LiarsAuctionState {
  gameType: 'liars_auction';
  sequenceId: number;
  isFinished: boolean;
  players: LAPlayer[];
  round: number;
  totalRounds: number;
  itemTrueValue: number;
  /** Private clues — each player gets a true clue but can lie about it */
  clues: Record<string, string>;
  /** Chat messages in discussion phase — players can share/lie about their clues */
  chatMessages: { playerId: string; text: string }[];
  /** Sealed bids */
  pendingBids: Record<string, number | null>;
  phase: 'clue_distribution' | 'discussion' | 'bidding' | 'resolution' | 'game_over';
  currentPlayerIndex: number;
  lastResult: {
    winnerId: string | null;
    winnerBid: number;
    trueValue: number;
    profit: number;
    allClues: Record<string, string>;
  } | null;
  rngState: [number, number, number, number];
}

export interface LAPlayer {
  id: string;
  gold: number;
}

export type LiarsAuctionAction =
  | { type: 'chat'; message: string }
  | { type: 'end_discussion' }
  | { type: 'bid'; amount: number };

function generateTrueClue(value: number, rng: DeterministicRNG): string {
  const types = [
    () => `价值 > ${Math.max(0, value - rng.nextIntRange(5, 15))}`,
    () => `价值 < ${value + rng.nextIntRange(5, 15)}`,
    () => `价值在 ${Math.max(0, value - rng.nextIntRange(10, 20))} - ${value + rng.nextIntRange(10, 20)} 之间`,
    () => value > 50 ? '价值 > 50' : '价值 ≤ 50',
  ];
  return types[rng.nextInt(types.length)]();
}

export class LiarsAuctionPlugin implements GamePlugin<LiarsAuctionState, LiarsAuctionAction> {
  readonly gameType = 'liars_auction';

  createInitialState(config: GameConfig, rngSeed: number): LiarsAuctionState {
    const rng = new DeterministicRNG(rngSeed);
    const trueValue = rng.nextIntRange(10, 101);
    const clues: Record<string, string> = {};
    for (const pid of config.players) {
      clues[pid] = generateTrueClue(trueValue, rng);
    }

    return {
      gameType: 'liars_auction',
      sequenceId: 0,
      isFinished: false,
      players: config.players.map(id => ({ id, gold: 100 })),
      round: 1,
      totalRounds: 6,
      itemTrueValue: trueValue,
      clues,
      chatMessages: [],
      pendingBids: Object.fromEntries(config.players.map(id => [id, null])),
      phase: 'discussion',
      currentPlayerIndex: 0,
      lastResult: null,
      rngState: rng.getState(),
    };
  }

  applyAction(state: LiarsAuctionState, action: LiarsAuctionAction): LiarsAuctionState {
    const s = JSON.parse(JSON.stringify(state)) as LiarsAuctionState;
    s.sequenceId++;

    if (action.type === 'chat') {
      s.chatMessages.push({ playerId: s.players[s.currentPlayerIndex].id, text: action.message });
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
      return s;
    }

    if (action.type === 'end_discussion') {
      s.phase = 'bidding';
      s.currentPlayerIndex = 0;
      return s;
    }

    if (action.type === 'bid') {
      const pid = s.players[s.currentPlayerIndex].id;
      s.pendingBids[pid] = Math.max(0, Math.min(action.amount, s.players[s.currentPlayerIndex].gold));

      const allBid = Object.values(s.pendingBids).every(b => b !== null);
      if (allBid) {
        const bids = s.players.map(p => ({ id: p.id, bid: s.pendingBids[p.id]! }))
          .sort((a, b) => b.bid - a.bid);
        const winner = bids[0].bid > 0 ? bids[0] : null;

        if (winner) {
          const winnerPlayer = s.players.find(p => p.id === winner.id)!;
          winnerPlayer.gold -= winner.bid;
          const profit = s.itemTrueValue - winner.bid;
          winnerPlayer.gold += s.itemTrueValue;

          s.lastResult = {
            winnerId: winner.id, winnerBid: winner.bid,
            trueValue: s.itemTrueValue, profit,
            allClues: s.clues,
          };
        } else {
          s.lastResult = {
            winnerId: null, winnerBid: 0,
            trueValue: s.itemTrueValue, profit: 0,
            allClues: s.clues,
          };
        }

        s.phase = 'resolution';

        if (s.round >= s.totalRounds) {
          s.isFinished = true;
          s.phase = 'game_over';
        } else {
          s.round++;
          const rng = new DeterministicRNG(0);
          rng.setState(s.rngState);
          s.itemTrueValue = rng.nextIntRange(10, 101);
          const clues: Record<string, string> = {};
          for (const p of s.players) clues[p.id] = generateTrueClue(s.itemTrueValue, rng);
          s.clues = clues;
          s.chatMessages = [];
          s.pendingBids = Object.fromEntries(s.players.map(p => [p.id, null]));
          s.rngState = rng.getState();
          s.phase = 'discussion';
          s.currentPlayerIndex = 0;
        }
      } else {
        s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
      }
    }

    return s;
  }

  getLegalActions(state: LiarsAuctionState, playerId: string): LiarsAuctionAction[] {
    const pIdx = state.players.findIndex(p => p.id === playerId);
    if (pIdx !== state.currentPlayerIndex || state.isFinished) return [];

    if (state.phase === 'discussion') return [{ type: 'chat', message: '' }, { type: 'end_discussion' }];
    if (state.phase === 'bidding') return [{ type: 'bid' } as any];
    return [];
  }

  getPlayerView(state: LiarsAuctionState, playerId: string): PlayerView {
    const idx = state.players.findIndex(p => p.id === playerId);
    return {
      playerId, gameType: 'liars_auction',
      round: state.round, yourGold: state.players[idx].gold,
      yourClue: state.clues[playerId],
      chatMessages: state.chatMessages,
      lastResult: state.lastResult, isFinished: state.isFinished,
    };
  }

  getObserverView(state: LiarsAuctionState): ObserverView {
    return {
      gameType: 'liars_auction', round: state.round,
      goldBalances: state.players.map(p => p.gold),
      chatMessages: state.chatMessages,
      lastResult: state.lastResult, isFinished: state.isFinished,
    };
  }

  isTerminal(state: LiarsAuctionState): boolean { return state.isFinished; }
  getTimeoutAction(state: LiarsAuctionState): LiarsAuctionAction {
    return state.phase === 'discussion' ? { type: 'end_discussion' } : { type: 'bid', amount: 0 };
  }
}
