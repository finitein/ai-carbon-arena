// ============================================================
// Sealed-Bid Auction Plugin — Vickrey auction with clues
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';
import { DeterministicRNG } from '../../core/rng';

export interface SealedBidState {
  gameType: 'sealed_bid_auction';
  sequenceId: number;
  isFinished: boolean;
  players: SBAPlayer[];
  round: number;
  totalRounds: number;
  itemTrueValue: number;
  playerClues: Record<string, string>;
  pendingBids: Record<string, number | null>;
  phase: 'bidding' | 'resolution' | 'game_over';
  currentPlayerIndex: number;
  lastResult: { winnerId: string; winnerBid: number; secondBid: number; trueValue: number; profit: number } | null;
  rngState: [number, number, number, number];
}

export interface SBAPlayer {
  id: string;
  balance: number;
}

export type SealedBidAction = { type: 'bid'; amount: number };

function generateClue(trueValue: number, rng: DeterministicRNG): string {
  const clueTypes = [
    () => `价值 > ${Math.max(0, trueValue - rng.nextIntRange(10, 30))}`,
    () => `价值 < ${trueValue + rng.nextIntRange(10, 30)}`,
    () => `价值在 ${Math.max(0, trueValue - rng.nextIntRange(15, 25))} - ${trueValue + rng.nextIntRange(15, 25)} 之间`,
    () => trueValue % 2 === 0 ? '价值是偶数' : '价值是奇数',
  ];
  return clueTypes[rng.nextInt(clueTypes.length)]();
}

export class SealedBidAuctionPlugin implements GamePlugin<SealedBidState, SealedBidAction> {
  readonly gameType = 'sealed_bid_auction';

  createInitialState(config: GameConfig, rngSeed: number): SealedBidState {
    const totalRounds = (config.settings as { rounds?: number } | undefined)?.rounds || 3;
    const rng = new DeterministicRNG(rngSeed);
    const trueValue = rng.nextIntRange(10, 101);
    const clues: Record<string, string> = {};
    for (const pid of config.players) {
      clues[pid] = generateClue(trueValue, rng);
    }

    return {
      gameType: 'sealed_bid_auction',
      sequenceId: 0,
      isFinished: false,
      players: config.players.map(id => ({ id, balance: 0 })),
      round: 1,
      totalRounds,
      itemTrueValue: trueValue,
      playerClues: clues,
      pendingBids: Object.fromEntries(config.players.map(id => [id, null])),
      phase: 'bidding',
      currentPlayerIndex: 0,
      lastResult: null,
      rngState: rng.getState(),
    };
  }

  applyAction(state: SealedBidState, action: SealedBidAction): SealedBidState {
    const s = JSON.parse(JSON.stringify(state)) as SealedBidState;
    s.sequenceId++;
    const playerId = s.players[s.currentPlayerIndex].id;
    s.pendingBids[playerId] = Math.max(0, action.amount);

    // Check if all bids submitted
    const allBid = Object.values(s.pendingBids).every(b => b !== null);
    if (allBid) {
      // Resolve: Vickrey auction — winner pays second-highest bid
      const bids = s.players.map(p => ({ id: p.id, bid: s.pendingBids[p.id]! }))
        .sort((a, b) => b.bid - a.bid);

      const winner = bids[0];
      const secondBid = bids.length > 1 ? bids[1].bid : 0;
      const profit = s.itemTrueValue - secondBid;

      const winnerPlayer = s.players.find(p => p.id === winner.id)!;
      winnerPlayer.balance += profit;

      s.lastResult = {
        winnerId: winner.id,
        winnerBid: winner.bid,
        secondBid,
        trueValue: s.itemTrueValue,
        profit,
      };
      s.phase = 'resolution';

      // Next round
      if (s.round >= s.totalRounds) {
        s.isFinished = true;
        s.phase = 'game_over';
      } else {
        s.round++;
        const rng = new DeterministicRNG(0);
        rng.setState(s.rngState);
        s.itemTrueValue = rng.nextIntRange(10, 101);
        const clues: Record<string, string> = {};
        for (const p of s.players) {
          clues[p.id] = generateClue(s.itemTrueValue, rng);
        }
        s.playerClues = clues;
        s.pendingBids = Object.fromEntries(s.players.map(p => [p.id, null]));
        s.rngState = rng.getState();
        s.phase = 'bidding';
        s.currentPlayerIndex = 0;
      }
    } else {
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    }

    return s;
  }

  getLegalActions(state: SealedBidState, playerId: string): SealedBidAction[] {
    const pIdx = state.players.findIndex(p => p.id === playerId);
    if (pIdx !== state.currentPlayerIndex || state.isFinished) return [];
    
    return [{ type: 'bid', amount: 0 }]; // Amount is flexible
  }

  getPlayerView(state: SealedBidState, playerId: string): PlayerView {
    const idx = state.players.findIndex(p => p.id === playerId);
    return {
      playerId, gameType: 'sealed_bid_auction',
      round: state.round, totalRounds: state.totalRounds,
      yourClue: state.playerClues[playerId],
      yourBalance: state.players[idx].balance,
      lastResult: state.lastResult, isFinished: state.isFinished,
    };
  }

  getObserverView(state: SealedBidState): ObserverView {
    return {
      gameType: 'sealed_bid_auction',
      round: state.round, balances: state.players.map(p => p.balance),
      lastResult: state.lastResult, isFinished: state.isFinished,
    };
  }

  isTerminal(state: SealedBidState): boolean { return state.isFinished; }
  getTimeoutAction(): SealedBidAction { return { type: 'bid', amount: 0 }; }
}
