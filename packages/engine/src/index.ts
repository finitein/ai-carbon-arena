// @carbon-arena/engine — unified exports

// Core types
export type { GamePlugin } from './types/game-plugin';
export type {
  GameState,
  GameAction,
  GameConfig,
  PlayerView,
  ObserverView,
  GameResult,
} from './types/game-state';

// Core classes
export { EngineCore } from './core/engine-core';
export { ViewLayer } from './core/view-layer';
export { DeterministicRNG } from './core/rng';

// Texas Hold'em Heads-Up plugin
export { TexasHoldemHUPlugin } from './plugins/texas-holdem-hu/plugin';
export type {
  TexasHoldemState,
  HoldemPlayerState,
  HandResultData,
  Card,
  Rank,
  Suit,
  BettingPhase,
  TexasHoldemConfig,
} from './plugins/texas-holdem-hu/state';
export type { TexasHoldemAction } from './plugins/texas-holdem-hu/actions';
export { Actions } from './plugins/texas-holdem-hu/actions';
export {
  evaluateHand,
  compareHands,
  HandRank,
  HAND_RANK_NAMES,
} from './plugins/texas-holdem-hu/hand-evaluator';
export type { EvaluatedHand } from './plugins/texas-holdem-hu/hand-evaluator';

// Prisoner's Dilemma plugin
export { PrisonersDilemmaPlugin } from './plugins/prisoners-dilemma/plugin';
export type { PDState, PDPlayer, PDMove, PDAction, PDRoundResult } from './plugins/prisoners-dilemma/plugin';

// Split or Steal plugin
export { SplitOrStealPlugin } from './plugins/split-or-steal/plugin';
export type { SoSState, SoSPlayer, SoSDecision, SoSAction, SoSResult, SoSMessage } from './plugins/split-or-steal/plugin';

// Liar's Dice plugin
export { LiarsDicePlugin } from './plugins/liars-dice/plugin';
export type { LiarsDiceState, LDPlayer, LiarsDiceAction } from './plugins/liars-dice/plugin';

// Kuhn Poker plugin
export { KuhnPokerPlugin } from './plugins/kuhn-poker/plugin';
export type { KuhnPokerState, KuhnPlayer, KuhnPokerAction, KuhnCard } from './plugins/kuhn-poker/plugin';

// Ultimatum Game plugin
export { UltimatumPlugin } from './plugins/ultimatum/plugin';
export type { UltimatumState, UltPlayer, UltimatumAction } from './plugins/ultimatum/plugin';

// Sealed-Bid Auction plugin
export { SealedBidAuctionPlugin } from './plugins/sealed-bid-auction/plugin';
export type { SealedBidState, SBAPlayer, SealedBidAction } from './plugins/sealed-bid-auction/plugin';

// Liar's Auction plugin
export { LiarsAuctionPlugin } from './plugins/liars-auction/plugin';
export type { LiarsAuctionState, LAPlayer, LiarsAuctionAction } from './plugins/liars-auction/plugin';

// Silicon Storm plugin
export { SiliconStormPlugin } from './plugins/silicon-storm/plugin';
export type { SiliconStormState, SSPlayer, SiliconStormAction, RoleType } from './plugins/silicon-storm/plugin';

// Heist Royale plugin
export { HeistRoyalePlugin } from './plugins/heist-royale/plugin';
export type { HeistRoyaleState, HRPlayer, HeistRoyaleAction, HeistCard, HRAccusation } from './plugins/heist-royale/plugin';
