// ============================================================
// Heist Royale Plugin — cooperative/betrayal + information game
// 6-player version for multiplayer arena
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';
import { DeterministicRNG } from '../../core/rng';

export type CardType = 'power' | 'sabotage';
export interface HeistCard { type: CardType; value: number; } // power: +1 to +5, sabotage: -3

export interface HeistRoyaleState {
  gameType: 'heist_royale';
  sequenceId: number;
  isFinished: boolean;
  players: HRPlayer[];
  round: number;
  totalRounds: number;
  mission: { requiredPower: number; reward: number };
  preDiscussMessages: { playerId: string; text: string }[];
  committedCards: Record<string, HeistCard | null>;
  declarations: Record<string, string>;
  accusations: HRAccusation[];
  phase: 'pre_discuss' | 'commit' | 'declare' | 'accuse' | 'reveal' | 'game_over';
  currentPlayerIndex: number;
  /** Track how many players have committed / accused this round */
  commitCount: number;
  accuseCount: number;
  rollingPrizePool: number;
  roundResult: {
    totalPower: number; success: boolean;
    sabotageCount: number; rewards: Record<string, number>;
  } | null;
  rngState: [number, number, number, number];
}

export interface HRPlayer {
  id: string; gold: number;
  hand: HeistCard[];
}

export interface HRAccusation {
  accuserId: string; targetId: string;
  tier: 'light' | 'heavy';
  result?: 'correct' | 'wrong';
}

export type HeistRoyaleAction =
  | { type: 'speak'; message: string }
  | { type: 'end_discussion' }
  | { type: 'commit_card'; cardIndex: number }
  | { type: 'declare'; claim: string }
  | { type: 'accuse'; target: string; tier: 'light' | 'heavy' }
  | { type: 'silence' };

export class HeistRoyalePlugin implements GamePlugin<HeistRoyaleState, HeistRoyaleAction> {
  readonly gameType = 'heist_royale';

  createInitialState(config: GameConfig, rngSeed: number): HeistRoyaleState {
    const rng = new DeterministicRNG(rngSeed);
    const totalRounds = 5;
    const playerCount = config.players.length; // 4-6 players

    const dealHand = (): HeistCard[] => {
      const hand: HeistCard[] = [];
      // 1 sabotage card + 2 power cards (each player starts with 3 cards)
      hand.push({ type: 'sabotage', value: -3 });
      hand.push({ type: 'power', value: rng.nextIntRange(1, 6) });
      hand.push({ type: 'power', value: rng.nextIntRange(1, 6) });
      return rng.shuffle(hand);
    };

    const players = config.players.map(id => ({
      id,
      gold: 50,
      hand: dealHand(),
    }));

    const committedCards: Record<string, HeistCard | null> = {};
    for (const p of players) committedCards[p.id] = null;

    // Scale mission difficulty with player count
    const minPower = Math.floor(playerCount * 1.5);
    const maxPower = Math.floor(playerCount * 2.5);

    return {
      gameType: 'heist_royale', sequenceId: 0, isFinished: false,
      players,
      round: 1, totalRounds,
      mission: {
        requiredPower: rng.nextIntRange(minPower, maxPower + 1),
        reward: rng.nextIntRange(20 + playerCount * 5, 40 + playerCount * 5),
      },
      preDiscussMessages: [],
      committedCards,
      declarations: {},
      accusations: [],
      phase: 'pre_discuss',
      currentPlayerIndex: 0,
      commitCount: 0,
      accuseCount: 0,
      rollingPrizePool: 0,
      roundResult: null,
      rngState: rng.getState(),
    };
  }

  applyAction(state: HeistRoyaleState, action: HeistRoyaleAction): HeistRoyaleState {
    const s = JSON.parse(JSON.stringify(state)) as HeistRoyaleState;
    s.sequenceId++;
    const n = s.players.length;

    if (action.type === 'speak') {
      s.preDiscussMessages.push({
        playerId: s.players[s.currentPlayerIndex].id,
        text: action.message,
      });
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % n;
      return s;
    }

    if (action.type === 'end_discussion') {
      if (s.phase === 'pre_discuss') {
        s.phase = 'commit';
        s.currentPlayerIndex = 0;
        s.commitCount = 0;
      } else if (s.phase === 'declare') {
        s.phase = 'accuse';
        s.currentPlayerIndex = 0;
        s.accuseCount = 0;
      }
      return s;
    }

    if (action.type === 'commit_card') {
      const pid = s.players[s.currentPlayerIndex].id;
      const card = s.players[s.currentPlayerIndex].hand[action.cardIndex];
      if (!card) return s;
      s.committedCards[pid] = card;
      s.players[s.currentPlayerIndex].hand.splice(action.cardIndex, 1);
      s.commitCount++;

      if (s.commitCount >= n) {
        // All players committed — move to declare phase
        s.phase = 'declare';
        s.currentPlayerIndex = 0;
      } else {
        s.currentPlayerIndex = (s.currentPlayerIndex + 1) % n;
      }
      return s;
    }

    if (action.type === 'declare') {
      s.declarations[s.players[s.currentPlayerIndex].id] = action.claim;
      if (Object.keys(s.declarations).length >= n) {
        s.phase = 'accuse';
        s.currentPlayerIndex = 0;
        s.accuseCount = 0;
      } else {
        s.currentPlayerIndex = (s.currentPlayerIndex + 1) % n;
      }
      return s;
    }

    if (action.type === 'accuse' || action.type === 'silence') {
      const currentPlayer = s.players[s.currentPlayerIndex];

      if (action.type === 'accuse') {
        const cost = action.tier === 'light' ? 5 : 15;
        currentPlayer.gold -= cost;
        const targetCard = s.committedCards[action.target];
        const correct = targetCard?.type === 'sabotage';
        const reward = action.tier === 'light'
          ? (correct ? 10 : -8)
          : (correct ? 30 : -23);
        currentPlayer.gold += reward;
        s.accusations.push({
          accuserId: currentPlayer.id,
          targetId: action.target,
          tier: action.tier,
          result: correct ? 'correct' : 'wrong',
        });
      } else {
        // Silence tax
        currentPlayer.gold -= 2;
        s.rollingPrizePool += 2;
      }

      s.accuseCount++;
      if (s.accuseCount >= n) {
        // All players have accused/stayed silent — resolve round
        return this.resolveRound(s);
      }
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % n;
      return s;
    }

    return s;
  }

  private resolveRound(s: HeistRoyaleState): HeistRoyaleState {
    const n = s.players.length;
    const cards = Object.values(s.committedCards).filter(c => c !== null) as HeistCard[];
    const totalPower = cards.reduce((sum, c) => sum + c.value, 0);
    const success = totalPower >= s.mission.requiredPower;
    const sabotageCount = cards.filter(c => c.type === 'sabotage').length;

    const rewards: Record<string, number> = {};
    if (success) {
      const share = Math.floor((s.mission.reward + s.rollingPrizePool) / n);
      for (const p of s.players) { p.gold += share; rewards[p.id] = share; }
      s.rollingPrizePool = 0;
    } else {
      const sabPool = Math.floor(s.mission.reward * 0.6);
      s.rollingPrizePool += Math.floor(s.mission.reward * 0.4);
      for (const p of s.players) {
        const card = s.committedCards[p.id];
        if (card?.type === 'sabotage') {
          const share = Math.floor(sabPool / Math.max(1, sabotageCount));
          p.gold += share; rewards[p.id] = share;
        } else if (card) {
          const consolation = card.value;
          p.gold += consolation; rewards[p.id] = consolation;
        }
      }
    }

    s.roundResult = { totalPower, success, sabotageCount, rewards };
    s.phase = 'reveal';

    if (s.round >= s.totalRounds) {
      s.isFinished = true; s.phase = 'game_over';
      return s;
    }

    // Next round
    s.round++;
    const rng = new DeterministicRNG(0); rng.setState(s.rngState);
    const minPower = Math.floor(n * 1.5);
    const maxPower = Math.floor(n * 2.5);
    s.mission = {
      requiredPower: rng.nextIntRange(minPower, maxPower + 1),
      reward: rng.nextIntRange(20 + n * 5, 40 + n * 5),
    };
    for (const p of s.players) {
      p.hand.push({
        type: rng.nextIntRange(0, 3) === 0 ? 'sabotage' : 'power',
        value: rng.nextIntRange(0, 3) === 0 ? -3 : rng.nextIntRange(1, 6),
      });
    }
    s.committedCards = {};
    for (const p of s.players) s.committedCards[p.id] = null;
    s.declarations = {};
    s.accusations = [];
    s.preDiscussMessages = [];
    s.phase = 'pre_discuss';
    s.currentPlayerIndex = 0;
    s.commitCount = 0;
    s.accuseCount = 0;
    s.rngState = rng.getState();
    return s;
  }

  getLegalActions(state: HeistRoyaleState, playerId: string): HeistRoyaleAction[] {
    if (state.isFinished) return [];

    const playerIdx = state.players.findIndex(p => p.id === playerId);
    if (playerIdx !== state.currentPlayerIndex) return []; // Not your turn

    const otherPlayers = state.players.filter(p => p.id !== playerId);

    if (state.phase === 'pre_discuss') {
      return [{ type: 'speak', message: '' }, { type: 'end_discussion' }];
    }

    if (state.phase === 'declare') {
      return [{ type: 'speak', message: '' }, { type: 'declare', claim: '' }, { type: 'end_discussion' }];
    }

    if (state.phase === 'commit') {
      const p = state.players[playerIdx];
      return p.hand.map((_, i) => ({ type: 'commit_card' as const, cardIndex: i }));
    }

    if (state.phase === 'accuse') {
      const actions: HeistRoyaleAction[] = [];
      for (const other of otherPlayers) {
        actions.push({ type: 'accuse', target: other.id, tier: 'light' });
        actions.push({ type: 'accuse', target: other.id, tier: 'heavy' });
      }
      actions.push({ type: 'silence' });
      return actions;
    }

    return [];
  }

  getPlayerView(state: HeistRoyaleState, playerId: string): PlayerView {
    const idx = state.players.findIndex(p => p.id === playerId);
    return {
      playerId, gameType: 'heist_royale',
      round: state.round, totalRounds: state.totalRounds,
      yourGold: state.players[idx]?.gold ?? 0,
      yourHand: state.players[idx]?.hand ?? [],
      allGold: state.players.map(p => ({ id: p.id, gold: p.gold })),
      mission: state.mission, phase: state.phase,
      playerCount: state.players.length,
      playerIds: state.players.map(p => p.id),
      preDiscussMessages: state.preDiscussMessages,
      declarations: state.declarations,
      accusations: state.accusations.map(a => ({
        ...a,
        result: a.accuserId === playerId ? a.result : undefined,
      })),
      roundResult: state.roundResult, isFinished: state.isFinished,
    };
  }

  getObserverView(state: HeistRoyaleState): ObserverView {
    return {
      gameType: 'heist_royale', round: state.round,
      goldBalances: state.players.map(p => p.gold),
      mission: state.mission, phase: state.phase,
      playerCount: state.players.length,
      roundResult: state.roundResult, isFinished: state.isFinished,
    };
  }

  isTerminal(state: HeistRoyaleState): boolean { return state.isFinished; }

  getTimeoutAction(state: HeistRoyaleState): HeistRoyaleAction {
    if (state.phase === 'commit') return { type: 'commit_card', cardIndex: 0 };
    if (state.phase === 'accuse') return { type: 'silence' };
    if (state.phase === 'declare') return { type: 'declare', claim: '我出了战力卡' };
    return { type: 'end_discussion' };
  }
}
