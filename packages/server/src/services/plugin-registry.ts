// ============================================================
// Plugin Registry — maps gameType to engine plugin constructor
// ============================================================

import type { GamePlugin } from '@carbon-arena/engine';
import {
  TexasHoldemHUPlugin,
  PrisonersDilemmaPlugin,
  SplitOrStealPlugin,
  LiarsDicePlugin,
  KuhnPokerPlugin,
  UltimatumPlugin,
  SealedBidAuctionPlugin,
  LiarsAuctionPlugin,
  SiliconStormPlugin,
  HeistRoyalePlugin,
} from '@carbon-arena/engine';

/** Factory function that creates a new plugin instance */
type PluginFactory = () => GamePlugin<any, any>;

const registry = new Map<string, PluginFactory>();
registry.set('texas_holdem_hu', () => new TexasHoldemHUPlugin());
registry.set('prisoners_dilemma', () => new PrisonersDilemmaPlugin());
registry.set('split_or_steal', () => new SplitOrStealPlugin());
registry.set('liars_dice', () => new LiarsDicePlugin());
registry.set('kuhn_poker', () => new KuhnPokerPlugin());
registry.set('ultimatum', () => new UltimatumPlugin());
registry.set('sealed_bid_auction', () => new SealedBidAuctionPlugin());
registry.set('liars_auction', () => new LiarsAuctionPlugin());
registry.set('silicon_storm', () => new SiliconStormPlugin());
registry.set('heist_royale', () => new HeistRoyalePlugin());

/** Get a plugin factory for the given game type */
export function getPluginFactory(gameType: string): PluginFactory | undefined {
  return registry.get(gameType);
}

/** Get all registered game types */
export function getRegisteredGameTypes(): string[] {
  return [...registry.keys()];
}

/** Check if a game type is registered */
export function isValidGameType(gameType: string): boolean {
  return registry.has(gameType);
}
