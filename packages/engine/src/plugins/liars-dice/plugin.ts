// ============================================================
// Liar's Dice Plugin — bluffing + probability
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';
import { DeterministicRNG } from '../../core/rng';

export interface LiarsDiceState {
  gameType: 'liars_dice';
  sequenceId: number;
  isFinished: boolean;
  players: [LDPlayer, LDPlayer];
  currentPlayerIndex: number;
  lastBid: { quantity: number; faceValue: number; bidderId: string } | null;
  phase: 'bidding' | 'challenge_resolution' | 'new_round' | 'game_over';
  roundNumber: number;
  rngState: [number, number, number, number];
  /** Whether 1s are wild (count as any face) */
  wildsEnabled: boolean;
}

export interface LDPlayer {
  id: string;
  dice: number[];
  diceCount: number;
  isEliminated: boolean;
}

export type LiarsDiceAction =
  | { type: 'bid'; quantity: number; faceValue: number }
  | { type: 'challenge' };

export class LiarsDicePlugin implements GamePlugin<LiarsDiceState, LiarsDiceAction> {
  readonly gameType = 'liars_dice';

  createInitialState(config: GameConfig, rngSeed: number): LiarsDiceState {
    const settings = config.settings as { wildsEnabled?: boolean; startingDice?: number } | undefined;
    const startingDice = settings?.startingDice || 5;
    const rng = new DeterministicRNG(rngSeed);

    const state: LiarsDiceState = {
      gameType: 'liars_dice',
      sequenceId: 0,
      isFinished: false,
      players: [
        { id: config.players[0], dice: [], diceCount: startingDice, isEliminated: false },
        { id: config.players[1], dice: [], diceCount: startingDice, isEliminated: false },
      ],
      currentPlayerIndex: 0,
      lastBid: null,
      phase: 'new_round',
      roundNumber: 0,
      rngState: rng.getState(),
      wildsEnabled: settings?.wildsEnabled ?? true,
    };

    return this.startNewRound(state);
  }

  applyAction(state: LiarsDiceState, action: LiarsDiceAction): LiarsDiceState {
    const s = JSON.parse(JSON.stringify(state)) as LiarsDiceState;
    s.sequenceId++;

    if (action.type === 'bid') {
      s.lastBid = {
        quantity: action.quantity,
        faceValue: action.faceValue,
        bidderId: s.players[s.currentPlayerIndex].id,
      };
      s.currentPlayerIndex = 1 - s.currentPlayerIndex;
    } else if (action.type === 'challenge') {
      s.phase = 'challenge_resolution';
      const bid = s.lastBid!;
      const allDice = [...s.players[0].dice, ...s.players[1].dice];

      let count = allDice.filter(d => d === bid.faceValue).length;
      if (s.wildsEnabled && bid.faceValue !== 1) {
        count += allDice.filter(d => d === 1).length;
      }

      const bidderIdx = s.players.findIndex(p => p.id === bid.bidderId);
      const challengerIdx = s.currentPlayerIndex;

      if (count >= bid.quantity) {
        // Bid was valid — challenger loses a die
        s.players[challengerIdx].diceCount--;
      } else {
        // Bid was wrong — bidder loses a die
        s.players[bidderIdx].diceCount--;
      }

      // Check elimination
      for (const p of s.players) {
        if (p.diceCount <= 0) p.isEliminated = true;
      }

      if (s.players.some(p => p.isEliminated)) {
        s.isFinished = true;
        s.phase = 'game_over';
      } else {
        return this.startNewRound(s);
      }
    }

    return s;
  }

  getLegalActions(state: LiarsDiceState, playerId: string): LiarsDiceAction[] {
    if (state.phase !== 'bidding' && state.phase !== 'new_round') return [];
    const pIdx = state.players.findIndex(p => p.id === playerId);
    if (pIdx !== state.currentPlayerIndex && playerId !== '') return [];
    const actions: LiarsDiceAction[] = [];

    if (state.lastBid) {
      actions.push({ type: 'challenge' });
      // Higher bids
      for (let face = state.lastBid.faceValue; face <= 6; face++) {
        const minQty = face === state.lastBid.faceValue ? state.lastBid.quantity + 1 : state.lastBid.quantity;
        const totalDice = state.players[0].diceCount + state.players[1].diceCount;
        for (let qty = minQty; qty <= totalDice; qty++) {
          actions.push({ type: 'bid', quantity: qty, faceValue: face });
        }
      }
      // Higher quantity at any face value
      for (let face = 1; face < state.lastBid.faceValue; face++) {
        const totalDice = state.players[0].diceCount + state.players[1].diceCount;
        for (let qty = state.lastBid.quantity + 1; qty <= totalDice; qty++) {
          actions.push({ type: 'bid', quantity: qty, faceValue: face });
        }
      }
    } else {
      // First bid — any valid bid
      const totalDice = state.players[0].diceCount + state.players[1].diceCount;
      for (let face = 1; face <= 6; face++) {
        for (let qty = 1; qty <= totalDice; qty++) {
          actions.push({ type: 'bid', quantity: qty, faceValue: face });
        }
      }
    }

    return actions;
  }

  getPlayerView(state: LiarsDiceState, playerId: string): PlayerView {
    const idx = state.players.findIndex(p => p.id === playerId);
    return {
      playerId,
      gameType: 'liars_dice',
      yourDice: state.players[idx].dice,
      opponentDiceCount: state.players[1 - idx].diceCount,
      lastBid: state.lastBid,
      roundNumber: state.roundNumber,
      isFinished: state.isFinished,
    };
  }

  getObserverView(state: LiarsDiceState): ObserverView {
    return {
      gameType: 'liars_dice',
      diceCounts: [state.players[0].diceCount, state.players[1].diceCount],
      lastBid: state.lastBid,
      roundNumber: state.roundNumber,
      isFinished: state.isFinished,
    };
  }

  isTerminal(state: LiarsDiceState): boolean { return state.isFinished; }
  getTimeoutAction(state: LiarsDiceState): LiarsDiceAction {
    return state.lastBid ? { type: 'challenge' } : { type: 'bid', quantity: 1, faceValue: 1 };
  }

  private startNewRound(state: LiarsDiceState): LiarsDiceState {
    const s = JSON.parse(JSON.stringify(state)) as LiarsDiceState;
    s.roundNumber++;
    s.lastBid = null;
    s.phase = 'bidding';

    const rng = new DeterministicRNG(0);
    rng.setState(s.rngState);

    for (const p of s.players) {
      p.dice = Array.from({ length: p.diceCount }, () => rng.nextIntRange(1, 7));
    }
    s.rngState = rng.getState();
    return s;
  }
}
