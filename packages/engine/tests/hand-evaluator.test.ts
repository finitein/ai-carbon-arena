import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, HandRank } from '../src/plugins/texas-holdem-hu/hand-evaluator';
import type { Card } from '../src/plugins/texas-holdem-hu/state';

describe('Hand Evaluator', () => {
  describe('Hand rank detection', () => {
    it('should detect Royal Flush', () => {
      const cards: Card[] = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.ROYAL_FLUSH);
    });

    it('should detect Straight Flush', () => {
      const cards: Card[] = ['9h', '8h', '7h', '6h', '5h'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT_FLUSH);
    });

    it('should detect Four of a Kind', () => {
      const cards: Card[] = ['Ah', 'Ad', 'Ac', 'As', 'Kh'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FOUR_OF_A_KIND);
    });

    it('should detect Full House', () => {
      const cards: Card[] = ['Ah', 'Ad', 'Ac', 'Ks', 'Kh'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FULL_HOUSE);
    });

    it('should detect Flush', () => {
      const cards: Card[] = ['Ah', 'Jh', '9h', '5h', '3h'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FLUSH);
    });

    it('should detect Straight', () => {
      const cards: Card[] = ['9h', '8d', '7c', '6s', '5h'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT);
    });

    it('should detect Wheel Straight (A-5)', () => {
      const cards: Card[] = ['Ah', '5d', '4c', '3s', '2h'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT);
      expect(result.kickers[0]).toBe(5); // High card is 5, not Ace
    });

    it('should detect Three of a Kind', () => {
      const cards: Card[] = ['Ah', 'Ad', 'Ac', 'Ks', '3h'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.THREE_OF_A_KIND);
    });

    it('should detect Two Pair', () => {
      const cards: Card[] = ['Ah', 'Ad', 'Ks', 'Kh', '3c'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.TWO_PAIR);
    });

    it('should detect One Pair', () => {
      const cards: Card[] = ['Ah', 'Ad', 'Ks', '9h', '3c'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.ONE_PAIR);
    });

    it('should detect High Card', () => {
      const cards: Card[] = ['Ah', 'Jd', '9s', '5h', '3c'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.HIGH_CARD);
    });
  });

  describe('7-card evaluation', () => {
    it('should find best 5-card hand from 7 cards', () => {
      // Hole: As Ks, Board: Qs Js Ts 3h 2d => Royal Flush
      const cards: Card[] = ['As', 'Ks', 'Qs', 'Js', 'Ts', '3h', '2d'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.ROYAL_FLUSH);
    });

    it('should find the flush over straight in 7 cards', () => {
      // Hole: 9h 8h, Board: 7h 6h 2h Td 3s => Flush
      const cards: Card[] = ['9h', '8h', '7h', '6h', '2h', 'Td', '3s'];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FLUSH);
    });
  });

  describe('Hand comparison', () => {
    it('should rank flush higher than straight', () => {
      const flush = evaluateHand(['Ah', 'Jh', '9h', '5h', '3h'] as Card[]);
      const straight = evaluateHand(['9h', '8d', '7c', '6s', '5h'] as Card[]);
      expect(compareHands(flush, straight)).toBeGreaterThan(0);
    });

    it('should compare same rank by kickers', () => {
      const pairAces = evaluateHand(['Ah', 'Ad', 'Ks', '9h', '3c'] as Card[]);
      const pairKings = evaluateHand(['Kh', 'Kd', 'Ac', '9s', '3h'] as Card[]);
      expect(compareHands(pairAces, pairKings)).toBeGreaterThan(0);
    });

    it('should detect equal hands', () => {
      const hand1 = evaluateHand(['Ah', 'Kd', 'Qs', 'Jh', '9c'] as Card[]);
      const hand2 = evaluateHand(['Ac', 'Ks', 'Qh', 'Jd', '9h'] as Card[]);
      expect(compareHands(hand1, hand2)).toBe(0);
    });
  });
});
