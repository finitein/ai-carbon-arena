import { describe, it, expect } from 'vitest';
import { EngineCore } from '../src/core/engine-core';
import { TexasHoldemHUPlugin } from '../src/plugins/texas-holdem-hu/plugin';
import type { TexasHoldemState } from '../src/plugins/texas-holdem-hu/state';
import type { TexasHoldemAction } from '../src/plugins/texas-holdem-hu/actions';
import type { GameConfig } from '../src/types/game-state';

function createTestEngine(seed = 42): EngineCore<TexasHoldemState, TexasHoldemAction> {
  const plugin = new TexasHoldemHUPlugin();
  const config: GameConfig = {
    gameType: 'texas_holdem_hu',
    players: ['player_a', 'player_b'],
    settings: {
      startingStack: 1000,
      smallBlind: 10,
      bigBlind: 20,
      actionTimeoutMs: 30000,
    },
  };
  return new EngineCore(plugin, config, seed);
}

describe('Texas Hold\'em Heads-Up', () => {
  describe('Initial state', () => {
    it('should create a valid initial state', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();

      expect(state.gameType).toBe('texas_holdem_hu');
      expect(state.handNum).toBe(1);
      expect(state.phase).toBe('preflop');
      expect(state.players).toHaveLength(2);
      expect(state.players[0].holeCards).toHaveLength(2);
      expect(state.players[1].holeCards).toHaveLength(2);
      expect(state.isFinished).toBe(false);
    });

    it('should post blinds correctly', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();
      const dealer = state.players[state.dealerIndex];
      const bigBlindPlayer = state.players[1 - state.dealerIndex];

      // SB = 10 for dealer in HU
      expect(dealer.totalBetThisHand).toBe(10);
      // BB = 20 for non-dealer
      expect(bigBlindPlayer.totalBetThisHand).toBe(20);
      // Pot = SB + BB
      expect(state.pot).toBe(30);
    });
  });

  describe('Determinism', () => {
    it('should produce the same game with the same seed', () => {
      const engine1 = createTestEngine(42);
      const engine2 = createTestEngine(42);

      const state1 = engine1.getFullState();
      const state2 = engine2.getFullState();

      // Same hole cards
      expect(state1.players[0].holeCards).toEqual(state2.players[0].holeCards);
      expect(state1.players[1].holeCards).toEqual(state2.players[1].holeCards);
    });
  });

  describe('Information set isolation', () => {
    it('should hide opponent cards in player view', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();

      const viewA = engine.getPlayerView('player_a');
      const viewB = engine.getPlayerView('player_b');

      // Player A can see their own cards
      expect(viewA.yourCards).toEqual(state.players[0].holeCards);
      // Player B can see their own cards
      expect(viewB.yourCards).toEqual(state.players[1].holeCards);

      // Views don't contain opponent's cards
      expect(viewA).not.toHaveProperty('opponentCards');
      expect(viewB).not.toHaveProperty('opponentCards');
    });

    it('observer view should not contain any hole cards', () => {
      const engine = createTestEngine();
      const view = engine.getObserverView();

      expect(view).not.toHaveProperty('yourCards');
      expect(view.playerA).not.toHaveProperty('holeCards');
      expect(view.playerB).not.toHaveProperty('holeCards');
    });
  });

  describe('Legal actions', () => {
    it('should allow fold, call, or raise preflop for dealer (SB)', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();
      const currentPlayerId = state.players[state.currentPlayerIndex].id;

      const actions = engine.getLegalActions(currentPlayerId);
      const actionTypes = actions.map((a) => a.type);

      expect(actionTypes).toContain('fold');
      // Dealer SB has posted 10, BB is 20, so they need to call or raise
      expect(actionTypes).toContain('call');
      expect(actionTypes).toContain('raise');
    });

    it('should return empty actions array for wrong player', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();
      const otherPlayerId = state.players[1 - state.currentPlayerIndex].id;

      const actions = engine.getLegalActions(otherPlayerId);
      expect(actions).toHaveLength(0);
    });
  });

  describe('Game flow', () => {
    it('should handle fold correctly', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();
      const currentPlayerId = state.players[state.currentPlayerIndex].id;

      engine.applyAction(currentPlayerId, { type: 'fold' });

      const newState = engine.getFullState();
      // After fold, the hand ends and a new hand is automatically dealt.
      // The new hand resets handResult to null.
      expect(newState.handNum).toBe(2);
      // The game should NOT be over (stacks are high enough)
      expect(newState.isFinished).toBe(false);
      // New hand should be in preflop
      expect(newState.phase).toBe('preflop');
      // Both players should have hole cards for the new hand
      expect(newState.players[0].holeCards).toHaveLength(2);
      expect(newState.players[1].holeCards).toHaveLength(2);
    });

    it('should handle check-check to advance phase', () => {
      const engine = createTestEngine();
      let state = engine.getFullState();
      const currentPlayerId = state.players[state.currentPlayerIndex].id;

      // SB calls
      engine.applyAction(currentPlayerId, { type: 'call' });
      state = engine.getFullState();

      // BB checks
      const bbId = state.players[state.currentPlayerIndex].id;
      engine.applyAction(bbId, { type: 'check' });
      state = engine.getFullState();

      // Should be on flop now
      expect(state.phase).toBe('flop');
      expect(state.communityCards).toHaveLength(3);
    });
  });

  describe('Timeout action', () => {
    it('should return check when check is available', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();
      const currentPlayerId = state.players[state.currentPlayerIndex].id;

      // Call the SB first
      engine.applyAction(currentPlayerId, { type: 'call' });

      // Now BB should be able to check
      const newState = engine.getFullState();
      const bbId = newState.players[newState.currentPlayerIndex].id;
      const timeoutAction = engine.getTimeoutAction(bbId);
      expect(timeoutAction.type).toBe('check');
    });

    it('should return fold when check is not available', () => {
      const engine = createTestEngine();
      const state = engine.getFullState();

      // In preflop, SB faces BB — can only call/raise/fold.
      // Timeout should give fold (can't check when facing a bet).
      const currentPlayerId = state.players[state.currentPlayerIndex].id;
      const timeoutAction = engine.getTimeoutAction(currentPlayerId);

      // SB preflop faces the BB (which is a bet), so timeout = fold
      expect(timeoutAction.type).toBe('fold');
    });
  });

  describe('Snapshot/restore', () => {
    it('should produce identical state after restore', () => {
      const engine = createTestEngine();
      const snapshot = engine.snapshot();

      const engine2 = createTestEngine(999); // Different seed
      engine2.restore(snapshot);

      expect(engine2.getFullState()).toEqual(engine.getFullState());
    });
  });
});
