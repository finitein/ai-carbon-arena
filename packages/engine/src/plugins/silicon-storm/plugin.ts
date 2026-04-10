// ============================================================
// Silicon Storm Plugin — Coup-like role bluffing (2-player)
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';
import { DeterministicRNG } from '../../core/rng';

export type RoleType = 'assassin' | 'merchant' | 'guardian' | 'spy' | 'diplomat';
const ALL_ROLES: RoleType[] = ['assassin', 'merchant', 'guardian', 'spy', 'diplomat'];

export interface SiliconStormState {
  gameType: 'silicon_storm';
  sequenceId: number;
  isFinished: boolean;
  players: [SSPlayer, SSPlayer];
  deck: RoleType[];
  currentPlayerIndex: number;
  phase: 'action' | 'challenge' | 'counteraction' | 'resolution' | 'game_over';
  pendingAction: {
    actor: string; claimedRole: RoleType | null;
    actionType: string; target?: string;
  } | null;
  turnNumber: number;
  rngState: [number, number, number, number];
}

export interface SSPlayer {
  id: string; lives: number; coins: number;
  roleCards: RoleType[]; isEliminated: boolean;
}

export type SiliconStormAction =
  | { type: 'income' } | { type: 'foreign_aid' }
  | { type: 'coup'; target: string } | { type: 'assassinate'; target: string }
  | { type: 'steal'; target: string } | { type: 'exchange' } | { type: 'tax' }
  | { type: 'challenge' } | { type: 'pass' }
  | { type: 'block'; claimedRole: RoleType };

export class SiliconStormPlugin implements GamePlugin<SiliconStormState, SiliconStormAction> {
  readonly gameType = 'silicon_storm';

  createInitialState(config: GameConfig, rngSeed: number): SiliconStormState {
    const rng = new DeterministicRNG(rngSeed);
    const deck = rng.shuffle([...ALL_ROLES, ...ALL_ROLES, ...ALL_ROLES]);
    return {
      gameType: 'silicon_storm', sequenceId: 0, isFinished: false,
      players: [
        { id: config.players[0], lives: 2, coins: 2, roleCards: [deck[0], deck[1]], isEliminated: false },
        { id: config.players[1], lives: 2, coins: 2, roleCards: [deck[2], deck[3]], isEliminated: false },
      ],
      deck: deck.slice(4), currentPlayerIndex: 0, phase: 'action',
      pendingAction: null, turnNumber: 1, rngState: rng.getState(),
    };
  }

  applyAction(state: SiliconStormState, action: SiliconStormAction): SiliconStormState {
    const s = JSON.parse(JSON.stringify(state)) as SiliconStormState;
    s.sequenceId++;
    if (s.phase === 'action') return this.handleAction(s, action);
    if (s.phase === 'challenge') return this.handleChallenge(s, action);
    return s;
  }

  private handleAction(s: SiliconStormState, action: SiliconStormAction): SiliconStormState {
    const opp = s.players[1 - s.currentPlayerIndex];
    switch (action.type) {
      case 'income': s.players[s.currentPlayerIndex].coins += 1; return this.endTurn(s);
      case 'foreign_aid': s.players[s.currentPlayerIndex].coins += 2; return this.endTurn(s);
      case 'coup':
        s.players[s.currentPlayerIndex].coins -= 7;
        opp.lives--; if (opp.lives <= 0) opp.isEliminated = true;
        if (opp.isEliminated) { s.isFinished = true; s.phase = 'game_over'; return s; }
        return this.endTurn(s);
      case 'tax':
        s.pendingAction = { actor: s.players[s.currentPlayerIndex].id, claimedRole: 'merchant', actionType: 'tax' };
        s.phase = 'challenge'; s.currentPlayerIndex = 1 - s.currentPlayerIndex; return s;
      case 'assassinate':
        s.pendingAction = { actor: s.players[s.currentPlayerIndex].id, claimedRole: 'assassin', actionType: 'assassinate', target: opp.id };
        s.players[s.currentPlayerIndex].coins -= 3;
        s.phase = 'challenge'; s.currentPlayerIndex = 1 - s.currentPlayerIndex; return s;
      case 'steal':
        s.pendingAction = { actor: s.players[s.currentPlayerIndex].id, claimedRole: 'spy', actionType: 'steal', target: opp.id };
        s.phase = 'challenge'; s.currentPlayerIndex = 1 - s.currentPlayerIndex; return s;
      default: return this.endTurn(s);
    }
  }

  private handleChallenge(s: SiliconStormState, action: SiliconStormAction): SiliconStormState {
    if (action.type === 'challenge') {
      const actorIdx = s.players.findIndex(p => p.id === s.pendingAction!.actor);
      const hasRole = s.players[actorIdx].roleCards.includes(s.pendingAction!.claimedRole!);
      if (hasRole) { s.players[s.currentPlayerIndex].lives--; }
      else { s.players[actorIdx].lives--; s.pendingAction = null; }
      for (const p of s.players) if (p.lives <= 0) p.isEliminated = true;
      if (s.players.some(p => p.isEliminated)) { s.isFinished = true; s.phase = 'game_over'; return s; }
      return s.pendingAction ? this.resolveAction(s) : this.endTurn(s);
    }
    if (action.type === 'block') { s.pendingAction = null; return this.endTurn(s); }
    return this.resolveAction(s);  // pass
  }

  private resolveAction(s: SiliconStormState): SiliconStormState {
    if (!s.pendingAction) return this.endTurn(s);
    const actorIdx = s.players.findIndex(p => p.id === s.pendingAction!.actor);
    if (s.pendingAction.actionType === 'tax') s.players[actorIdx].coins += 3;
    else if (s.pendingAction.actionType === 'assassinate') {
      const t = s.players.find(p => p.id === s.pendingAction!.target)!;
      t.lives--; if (t.lives <= 0) { t.isEliminated = true; s.isFinished = true; s.phase = 'game_over'; return s; }
    } else if (s.pendingAction.actionType === 'steal') {
      const t = s.players.find(p => p.id === s.pendingAction!.target)!;
      const stolen = Math.min(2, t.coins); t.coins -= stolen; s.players[actorIdx].coins += stolen;
    }
    return this.endTurn(s);
  }

  private endTurn(s: SiliconStormState): SiliconStormState {
    s.pendingAction = null; s.phase = 'action'; s.currentPlayerIndex = 1 - s.currentPlayerIndex; s.turnNumber++; return s;
  }

  getLegalActions(state: SiliconStormState, playerId: string): SiliconStormAction[] {
    if (state.isFinished) return [];
    const pIdx = state.players.findIndex(p => p.id === playerId);
    if (pIdx !== state.currentPlayerIndex && playerId !== '') return [];
    
    if (state.phase === 'action') {
      const p = state.players.find(pl => pl.id === playerId)!;
      const opp = state.players.find(pl => pl.id !== playerId)!;
      if (p.coins >= 10) return [{ type: 'coup', target: opp.id }];
      const a: SiliconStormAction[] = [{ type: 'income' }, { type: 'foreign_aid' }, { type: 'tax' }, { type: 'steal', target: opp.id }];
      if (p.coins >= 7) a.push({ type: 'coup', target: opp.id });
      if (p.coins >= 3) a.push({ type: 'assassinate', target: opp.id });
      return a;
    }
    return [{ type: 'challenge' }, { type: 'pass' }, { type: 'block', claimedRole: 'guardian' }];
  }

  getPlayerView(state: SiliconStormState, playerId: string): PlayerView {
    const idx = state.players.findIndex(p => p.id === playerId);
    return { playerId, gameType: 'silicon_storm', yourRoles: state.players[idx].roleCards,
      yourCoins: state.players[idx].coins, yourLives: state.players[idx].lives,
      opponentCoins: state.players[1 - idx].coins, opponentLives: state.players[1 - idx].lives,
      pendingAction: state.pendingAction, phase: state.phase, turnNumber: state.turnNumber, isFinished: state.isFinished };
  }

  getObserverView(state: SiliconStormState): ObserverView {
    return { gameType: 'silicon_storm', coins: state.players.map(p => p.coins), lives: state.players.map(p => p.lives),
      pendingAction: state.pendingAction, phase: state.phase, turnNumber: state.turnNumber, isFinished: state.isFinished };
  }

  isTerminal(state: SiliconStormState): boolean { return state.isFinished; }
  getTimeoutAction(state: SiliconStormState): SiliconStormAction {
    if (state.phase === 'challenge') return { type: 'pass' };
    return { type: 'income' };
  }
}
