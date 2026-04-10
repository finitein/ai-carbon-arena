// ============================================================
// Texas Hold'em Heads-Up — State types
// ============================================================

import type { GameState } from '../../types/game-state';

/** Card suits */
export type Suit = 'h' | 'd' | 'c' | 's';

/** Card ranks */
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

/** A card is represented as a 2-character string, e.g. "As", "Td", "2c" */
export type Card = `${Rank}${Suit}`;

/** All 52 cards in a standard deck */
export const ALL_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const ALL_SUITS: Suit[] = ['h', 'd', 'c', 's'];

export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of ALL_RANKS) {
    for (const suit of ALL_SUITS) {
      deck.push(`${rank}${suit}` as Card);
    }
  }
  return deck;
}

/** Betting round phases */
export type BettingPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

/** Per-player state within a hand */
export interface HoldemPlayerState {
  id: string;
  holeCards: Card[];
  chips: number;
  currentBet: number;
  totalBetThisHand: number;
  isFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;
}

/** State for the overall match (multi-hand) */
export interface TexasHoldemState extends GameState {
  gameType: 'texas_holdem_hu';

  // Match-level state
  players: [HoldemPlayerState, HoldemPlayerState];
  dealerIndex: number; // 0 or 1 — rotates each hand
  handNum: number;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;

  // Current hand state
  phase: BettingPhase;
  communityCards: Card[];
  pot: number;
  deck: Card[];
  currentPlayerIndex: number; // whose turn it is
  minRaise: number;
  lastRaiseAmount: number;
  actionCount: number; // actions taken in current betting round
  rngState: [number, number, number, number]; // RNG snapshot for deterministic restore

  // Hand result (set when hand is complete)
  handResult: HandResultData | null;

  // Game over
  sequenceId: number;
  isFinished: boolean;
}

/** Data about a completed hand */
export interface HandResultData {
  winnerId: string | null; // null = draw/split
  pot: number;
  resultType: 'showdown' | 'fold' | 'timeout';
  showdown?: {
    playerCards: Record<string, Card[]>;
    communityCards: Card[];
    handRanks: Record<string, string>;
  };
}

/** Texas Hold'em game config */
export interface TexasHoldemConfig {
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  actionTimeoutMs: number;
}

export const DEFAULT_HOLDEM_CONFIG: TexasHoldemConfig = {
  startingStack: 10000,
  smallBlind: 50,
  bigBlind: 100,
  actionTimeoutMs: 30000,
};
