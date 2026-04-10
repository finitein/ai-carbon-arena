// ============================================================
// Baseline Bots — Universal RandomBot + Texas Hold'em specific bots
// ============================================================

import type { TexasHoldemState } from '@carbon-arena/engine';
import type { TexasHoldemAction } from '@carbon-arena/engine';
import { TexasHoldemHUPlugin } from '@carbon-arena/engine';
import { getPluginFactory, getRegisteredGameTypes } from '../services/plugin-registry';
import { EngineCore } from '@carbon-arena/engine';

const texasPlugin = new TexasHoldemHUPlugin();

// ============================================================
// Universal RandomBot — works with ANY game type via plugin registry
// ============================================================

/**
 * Universal RandomBot — picks a random legal action for any game type.
 * Uses the plugin registry to get legal actions for the current game state.
 */
export function universalRandomBotDecide(
  gameType: string,
  state: any,
  playerId: string,
): any {
  const factory = getPluginFactory(gameType);
  if (!factory) {
    throw new Error(`Unknown game type for bot: ${gameType}`);
  }

  const plugin = factory();
  const legalActions = plugin.getLegalActions(state, playerId);

  if (!legalActions || legalActions.length === 0) {
    // Fallback: return a generic "pass" or first timeout action
    return plugin.getTimeoutAction(state, playerId);
  }

  return legalActions[Math.floor(Math.random() * legalActions.length)];
}

/**
 * Get a deterministic bot agent ID for a game type.
 * These IDs are used when creating bot opponents for timeout fallback.
 */
export function getBotAgentId(gameType: string): string {
  return `bot_random_${gameType}`;
}

/**
 * Get bot display name for a game type.
 */
export function getBotAgentName(gameType: string): string {
  return `Random Bot (${gameType})`;
}

/**
 * Get all available bot agent IDs across all game types.
 */
export function getAllBotAgentIds(): { agentId: string; agentName: string; gameType: string }[] {
  return getRegisteredGameTypes().map(gt => ({
    agentId: getBotAgentId(gt),
    agentName: getBotAgentName(gt),
    gameType: gt,
  }));
}

// ============================================================
// Texas Hold'em specific bots (kept for backward compatibility)
// ============================================================

/**
 * RandomBot — picks a random legal action (Texas Hold'em specific).
 * Serves as the floor baseline (should lose to everything).
 */
export function randomBotDecide(
  state: TexasHoldemState,
  playerId: string,
): TexasHoldemAction {
  const legalActions = texasPlugin.getLegalActions(state, playerId);
  if (legalActions.length === 0) {
    return { type: 'fold' };
  }
  return legalActions[Math.floor(Math.random() * legalActions.length)];
}

/**
 * RuleBot — simple heuristic strategy (Texas Hold'em specific).
 * Plays tight-aggressive based on hand strength position.
 */
export function ruleBotDecide(
  state: TexasHoldemState,
  playerId: string,
): TexasHoldemAction {
  const legalActions = texasPlugin.getLegalActions(state, playerId);
  if (legalActions.length === 0) return { type: 'fold' };

  const playerIdx = state.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1) return { type: 'fold' };

  const player = state.players[playerIdx];
  const opponent = state.players[1 - playerIdx];
  const holeCards = player.holeCards;

  // Simple hand strength heuristic
  const strength = evaluatePreflop(holeCards);

  const canCheck = legalActions.some((a) => a.type === 'check');
  const canCall = legalActions.some((a) => a.type === 'call');
  const canRaise = legalActions.some((a) => a.type === 'raise');
  const canBet = legalActions.some((a) => a.type === 'bet');
  const toCall = opponent.currentBet - player.currentBet;

  // Strong hand: raise/bet aggressively
  if (strength >= 0.8) {
    if (canRaise) {
      const raiseAction = legalActions.find((a) => a.type === 'raise');
      return raiseAction!;
    }
    if (canBet) {
      const betAction = legalActions.find((a) => a.type === 'bet');
      return betAction!;
    }
    if (canCall) return { type: 'call' };
    if (canCheck) return { type: 'check' };
  }

  // Medium hand: call or check
  if (strength >= 0.4) {
    if (canCheck) return { type: 'check' };
    if (canCall && toCall <= player.chips * 0.15) return { type: 'call' };
    return { type: 'fold' };
  }

  // Weak hand: check or fold
  if (canCheck) return { type: 'check' };
  return { type: 'fold' };
}

/**
 * Simple preflop hand strength heuristic (0-1).
 * Based on high card value, pocket pairs, and suitedness.
 */
function evaluatePreflop(holeCards: string[]): number {
  if (holeCards.length < 2) return 0.3;

  const rankValues: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };

  const r1 = rankValues[holeCards[0][0]] || 5;
  const r2 = rankValues[holeCards[1][0]] || 5;
  const suited = holeCards[0][1] === holeCards[1][1];
  const isPair = r1 === r2;

  let score = (r1 + r2) / 28; // Max = 1.0 (AA)

  if (isPair) score += 0.2;
  if (suited) score += 0.05;
  if (Math.abs(r1 - r2) <= 2 && !isPair) score += 0.03; // Connectors

  return Math.min(score, 1.0);
}
