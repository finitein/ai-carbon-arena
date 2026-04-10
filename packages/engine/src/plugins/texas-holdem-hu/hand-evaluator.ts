// ============================================================
// Hand Evaluator — evaluate best 5-card hand from 7 cards
// ============================================================

import type { Card, Rank, Suit } from './state';

/** Hand rank categories (higher = stronger) */
export enum HandRank {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

/** Display names for hand ranks */
export const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'high_card',
  [HandRank.ONE_PAIR]: 'one_pair',
  [HandRank.TWO_PAIR]: 'two_pair',
  [HandRank.THREE_OF_A_KIND]: 'three_of_a_kind',
  [HandRank.STRAIGHT]: 'straight',
  [HandRank.FLUSH]: 'flush',
  [HandRank.FULL_HOUSE]: 'full_house',
  [HandRank.FOUR_OF_A_KIND]: 'four_of_a_kind',
  [HandRank.STRAIGHT_FLUSH]: 'straight_flush',
  [HandRank.ROYAL_FLUSH]: 'royal_flush',
};

/** Evaluated hand result */
export interface EvaluatedHand {
  rank: HandRank;
  rankName: string;
  /** Tiebreaker values (descending importance) */
  kickers: number[];
  /** The 5 cards that form the best hand */
  bestCards: Card[];
}

/** Rank value map (2=2 ... A=14) */
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function cardRank(card: Card): Rank {
  return card[0] as Rank;
}

function cardSuit(card: Card): Suit {
  return card[1] as Suit;
}

function cardValue(card: Card): number {
  return RANK_VALUES[cardRank(card)];
}

/**
 * Evaluate the best 5-card hand from up to 7 cards.
 * Tries all C(7,5) = 21 combinations and returns the strongest.
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error(`Need at least 5 cards, got ${cards.length}`);
  }

  if (cards.length === 5) {
    return evaluate5Cards(cards);
  }

  // Generate all 5-card combinations
  const combos = combinations(cards, 5);
  let best: EvaluatedHand | null = null;

  for (const combo of combos) {
    const result = evaluate5Cards(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }

  return best!;
}

/** Compare two evaluated hands. Returns >0 if a is stronger, <0 if b is stronger, 0 if equal */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  // Same rank — compare kickers
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) {
      return a.kickers[i] - b.kickers[i];
    }
  }
  return 0;
}

/** Evaluate exactly 5 cards */
function evaluate5Cards(cards: Card[]): EvaluatedHand {
  const values = cards.map(cardValue).sort((a, b) => b - a);
  const suits = cards.map(cardSuit);

  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight = checkStraight(values);
  const isWheelStraight = checkWheelStraight(values);

  // Count occurrences of each rank value
  const counts = new Map<number, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  const countEntries = [...counts.entries()].sort((a, b) => {
    // Sort by count desc, then value desc
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const sortedCards = [...cards].sort((a, b) => cardValue(b) - cardValue(a));

  // Royal Flush
  if (isFlush && isStraight && values[0] === 14) {
    return { rank: HandRank.ROYAL_FLUSH, rankName: HAND_RANK_NAMES[HandRank.ROYAL_FLUSH], kickers: [14], bestCards: sortedCards };
  }

  // Straight Flush
  if (isFlush && (isStraight || isWheelStraight)) {
    const highCard = isWheelStraight ? 5 : values[0];
    return { rank: HandRank.STRAIGHT_FLUSH, rankName: HAND_RANK_NAMES[HandRank.STRAIGHT_FLUSH], kickers: [highCard], bestCards: sortedCards };
  }

  // Four of a Kind
  if (countEntries[0][1] === 4) {
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      rankName: HAND_RANK_NAMES[HandRank.FOUR_OF_A_KIND],
      kickers: [countEntries[0][0], countEntries[1][0]],
      bestCards: sortedCards,
    };
  }

  // Full House
  if (countEntries[0][1] === 3 && countEntries[1][1] === 2) {
    return {
      rank: HandRank.FULL_HOUSE,
      rankName: HAND_RANK_NAMES[HandRank.FULL_HOUSE],
      kickers: [countEntries[0][0], countEntries[1][0]],
      bestCards: sortedCards,
    };
  }

  // Flush
  if (isFlush) {
    return { rank: HandRank.FLUSH, rankName: HAND_RANK_NAMES[HandRank.FLUSH], kickers: values, bestCards: sortedCards };
  }

  // Straight
  if (isStraight || isWheelStraight) {
    const highCard = isWheelStraight ? 5 : values[0];
    return { rank: HandRank.STRAIGHT, rankName: HAND_RANK_NAMES[HandRank.STRAIGHT], kickers: [highCard], bestCards: sortedCards };
  }

  // Three of a Kind
  if (countEntries[0][1] === 3) {
    const kickers = countEntries.filter((e) => e[1] === 1).map((e) => e[0]).sort((a, b) => b - a);
    return {
      rank: HandRank.THREE_OF_A_KIND,
      rankName: HAND_RANK_NAMES[HandRank.THREE_OF_A_KIND],
      kickers: [countEntries[0][0], ...kickers],
      bestCards: sortedCards,
    };
  }

  // Two Pair
  if (countEntries[0][1] === 2 && countEntries[1][1] === 2) {
    const pairs = [countEntries[0][0], countEntries[1][0]].sort((a, b) => b - a);
    const kicker = countEntries[2][0];
    return {
      rank: HandRank.TWO_PAIR,
      rankName: HAND_RANK_NAMES[HandRank.TWO_PAIR],
      kickers: [...pairs, kicker],
      bestCards: sortedCards,
    };
  }

  // One Pair
  if (countEntries[0][1] === 2) {
    const kickers = countEntries.filter((e) => e[1] === 1).map((e) => e[0]).sort((a, b) => b - a);
    return {
      rank: HandRank.ONE_PAIR,
      rankName: HAND_RANK_NAMES[HandRank.ONE_PAIR],
      kickers: [countEntries[0][0], ...kickers],
      bestCards: sortedCards,
    };
  }

  // High Card
  return { rank: HandRank.HIGH_CARD, rankName: HAND_RANK_NAMES[HandRank.HIGH_CARD], kickers: values, bestCards: sortedCards };
}

/** Check if sorted desc values form a straight (e.g., [14, 13, 12, 11, 10]) */
function checkStraight(sortedDesc: number[]): boolean {
  for (let i = 0; i < sortedDesc.length - 1; i++) {
    if (sortedDesc[i] - sortedDesc[i + 1] !== 1) return false;
  }
  return true;
}

/** Check for wheel straight: A-2-3-4-5 (values sorted desc = [14, 5, 4, 3, 2]) */
function checkWheelStraight(sortedDesc: number[]): boolean {
  return (
    sortedDesc[0] === 14 &&
    sortedDesc[1] === 5 &&
    sortedDesc[2] === 4 &&
    sortedDesc[3] === 3 &&
    sortedDesc[4] === 2
  );
}

/** Generate all k-element combinations of an array */
function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];

  function backtrack(start: number) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1);
      combo.pop();
    }
  }

  backtrack(0);
  return result;
}
