// ============================================================
// Texas Hold'em Heads-Up Plugin — complete game implementation
// ============================================================

import type { GamePlugin } from '../../types/game-plugin';
import type { GameConfig, PlayerView, ObserverView } from '../../types/game-state';
import { DeterministicRNG } from '../../core/rng';
import { evaluateHand, compareHands } from './hand-evaluator';
import type {
  TexasHoldemState,
  BettingPhase,
} from './state';
import { createStandardDeck, DEFAULT_HOLDEM_CONFIG } from './state';
import type { TexasHoldemAction } from './actions';

export class TexasHoldemHUPlugin
  implements GamePlugin<TexasHoldemState, TexasHoldemAction>
{
  readonly gameType = 'texas_holdem_hu';

  // ============================================================
  // createInitialState
  // ============================================================
  createInitialState(config: GameConfig, rngSeed: number): TexasHoldemState {
    const settings = {
      ...DEFAULT_HOLDEM_CONFIG,
      ...(config.settings as Partial<typeof DEFAULT_HOLDEM_CONFIG> | undefined),
    };
    const [playerA, playerB] = config.players;

    const rng = new DeterministicRNG(rngSeed);

    const state: TexasHoldemState = {
      gameType: 'texas_holdem_hu',
      sequenceId: 0,
      isFinished: false,
      players: [
        {
          id: playerA,
          holeCards: [],
          chips: settings.startingStack,
          currentBet: 0,
          totalBetThisHand: 0,
          isFolded: false,
          isAllIn: false,
          hasActed: false,
        },
        {
          id: playerB,
          holeCards: [],
          chips: settings.startingStack,
          currentBet: 0,
          totalBetThisHand: 0,
          isFolded: false,
          isAllIn: false,
          hasActed: false,
        },
      ],
      dealerIndex: 0,
      handNum: 0,
      smallBlind: settings.smallBlind,
      bigBlind: settings.bigBlind,
      startingStack: settings.startingStack,
      phase: 'preflop',
      communityCards: [],
      pot: 0,
      deck: [],
      currentPlayerIndex: 0,
      minRaise: settings.bigBlind,
      lastRaiseAmount: settings.bigBlind,
      actionCount: 0,
      rngState: rng.getState(),
      handResult: null,
    };

    // Deal the first hand
    return this.dealNewHand(state);
  }

  // ============================================================
  // applyAction
  // ============================================================
  applyAction(state: TexasHoldemState, action: TexasHoldemAction): TexasHoldemState {
    let newState = deepClone(state);
    newState.sequenceId++;

    const player = newState.players[newState.currentPlayerIndex];
    const opponent = newState.players[1 - newState.currentPlayerIndex];

    switch (action.type) {
      case 'fold':
        player.isFolded = true;
        // Hand ends — opponent wins
        newState.handResult = {
          winnerId: opponent.id,
          pot: newState.pot,
          resultType: 'fold',
        };
        newState = this.resolveHandEnd(newState);
        break;

      case 'check':
        player.hasActed = true;
        newState.actionCount++;
        break;

      case 'call': {
        const callAmount = Math.min(
          opponent.currentBet - player.currentBet,
          player.chips,
        );
        player.chips -= callAmount;
        player.currentBet += callAmount;
        player.totalBetThisHand += callAmount;
        newState.pot += callAmount;
        if (player.chips === 0) player.isAllIn = true;
        player.hasActed = true;
        newState.actionCount++;
        break;
      }

      case 'bet': {
        const betAmount = Math.min(action.amount, player.chips);
        player.chips -= betAmount;
        player.currentBet += betAmount;
        player.totalBetThisHand += betAmount;
        newState.pot += betAmount;
        newState.minRaise = betAmount;
        newState.lastRaiseAmount = betAmount;
        if (player.chips === 0) player.isAllIn = true;
        player.hasActed = true;
        // Reset opponent's hasActed since they need to respond
        opponent.hasActed = false;
        newState.actionCount++;
        break;
      }

      case 'raise': {
        const raiseTotal = Math.min(action.amount, player.chips + player.currentBet);
        const raiseAmount = raiseTotal - player.currentBet;
        const actualRaise = raiseTotal - opponent.currentBet;
        player.chips -= raiseAmount;
        player.currentBet = raiseTotal;
        player.totalBetThisHand += raiseAmount;
        newState.pot += raiseAmount;
        newState.minRaise = actualRaise > 0 ? actualRaise : newState.bigBlind;
        newState.lastRaiseAmount = actualRaise;
        if (player.chips === 0) player.isAllIn = true;
        player.hasActed = true;
        // Reset opponent's hasActed since they need to respond
        opponent.hasActed = false;
        newState.actionCount++;
        break;
      }
    }

    // Check if the betting round is complete (only if hand hasn't ended)
    if (!newState.handResult) {
      if (this.isBettingRoundComplete(newState)) {
        newState = this.advancePhase(newState);
      } else {
        // Switch to the other player
        newState.currentPlayerIndex = 1 - newState.currentPlayerIndex;
      }
    }

    return newState;
  }

  // ============================================================
  // getLegalActions
  // ============================================================
  getLegalActions(state: TexasHoldemState, playerId: string): TexasHoldemAction[] {
    if (state.isFinished || state.phase === 'showdown') return [];

    const playerIdx = state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1 || playerIdx !== state.currentPlayerIndex) return [];

    const player = state.players[playerIdx];
    const opponent = state.players[1 - playerIdx];

    if (player.isFolded || player.isAllIn) return [];

    const actions: TexasHoldemAction[] = [];

    // Fold is always available
    actions.push({ type: 'fold' });

    const toCall = opponent.currentBet - player.currentBet;

    if (toCall === 0) {
      // No bet to match — can check or bet
      actions.push({ type: 'check' });

      // Bet (only if not all-in and has enough chips)
      if (player.chips > 0) {
        const minBet = Math.min(state.bigBlind, player.chips);
        const maxBet = player.chips;
        actions.push({ type: 'bet', amount: minBet });
        if (maxBet > minBet) {
          actions.push({ type: 'bet', amount: maxBet });
        }
      }
    } else {
      // There's a bet to match
      // Call
      if (player.chips > 0) {
        actions.push({ type: 'call' });
      }

      // Raise
      if (player.chips > toCall) {
        const minRaiseTotal = opponent.currentBet + Math.max(state.minRaise, state.bigBlind);
        const minRaise = Math.min(minRaiseTotal, player.chips + player.currentBet);
        const maxRaise = player.chips + player.currentBet; // All-in raise

        actions.push({ type: 'raise', amount: minRaise });
        if (maxRaise > minRaise) {
          actions.push({ type: 'raise', amount: maxRaise });
        }
      }
    }

    return actions;
  }

  // ============================================================
  // getPlayerView
  // ============================================================
  getPlayerView(state: TexasHoldemState, playerId: string): PlayerView {
    const playerIdx = state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) throw new Error(`Player ${playerId} not found`);

    const player = state.players[playerIdx];
    const opponent = state.players[1 - playerIdx];

    return {
      playerId,
      gameType: 'texas_holdem_hu',
      handNum: state.handNum,
      phase: state.phase,
      yourCards: player.holeCards,
      communityCards: state.communityCards,
      pot: state.pot,
      yourStack: player.chips,
      opponentStack: opponent.chips,
      yourBetThisRound: player.currentBet,
      opponentBetThisRound: opponent.currentBet,
      dealer: playerIdx === state.dealerIndex ? 'you' : 'opponent',
      isFinished: state.isFinished,
      handResult: state.handResult,
    };
  }

  // ============================================================
  // getObserverView
  // ============================================================
  getObserverView(state: TexasHoldemState): ObserverView {
    return {
      gameType: 'texas_holdem_hu',
      handNum: state.handNum,
      phase: state.phase,
      communityCards: state.communityCards,
      pot: state.pot,
      playerA: {
        name: state.players[0].id,
        stack: state.players[0].chips,
        betThisRound: state.players[0].currentBet,
        isDealer: state.dealerIndex === 0,
        status: state.players[0].isFolded
          ? 'folded'
          : state.players[0].isAllIn
            ? 'all_in'
            : 'active',
      },
      playerB: {
        name: state.players[1].id,
        stack: state.players[1].chips,
        betThisRound: state.players[1].currentBet,
        isDealer: state.dealerIndex === 1,
        status: state.players[1].isFolded
          ? 'folded'
          : state.players[1].isAllIn
            ? 'all_in'
            : 'active',
      },
      isFinished: state.isFinished,
    };
  }

  // ============================================================
  // isTerminal
  // ============================================================
  isTerminal(state: TexasHoldemState): boolean {
    return state.isFinished;
  }

  // ============================================================
  // getTimeoutAction
  // ============================================================
  getTimeoutAction(state: TexasHoldemState, playerId: string): TexasHoldemAction {
    const legalActions = this.getLegalActions(state, playerId);
    // Check if can check
    const checkAction = legalActions.find((a) => a.type === 'check');
    if (checkAction) return checkAction;
    // Otherwise fold
    return { type: 'fold' };
  }

  // ============================================================
  // Internal helpers
  // ============================================================

  /** Deal a new hand — shuffle, deal hole cards, post blinds */
  private dealNewHand(state: TexasHoldemState): TexasHoldemState {
    const newState = deepClone(state);
    newState.handNum++;
    newState.handResult = null;

    // Reset player hand-level state
    for (const player of newState.players) {
      player.holeCards = [];
      player.currentBet = 0;
      player.totalBetThisHand = 0;
      player.isFolded = false;
      player.isAllIn = false;
      player.hasActed = false;
    }

    // Shuffle deck
    const rng = new DeterministicRNG(0);
    rng.setState(newState.rngState);
    const deck = rng.shuffle(createStandardDeck());
    newState.rngState = rng.getState();

    // Deal 2 hole cards each
    newState.players[0].holeCards = [deck[0], deck[1]];
    newState.players[1].holeCards = [deck[2], deck[3]];
    newState.deck = deck.slice(4);

    // Post blinds: In HU, dealer = small blind, non-dealer = big blind
    const sbIndex = newState.dealerIndex;
    const bbIndex = 1 - sbIndex;

    const sbAmount = Math.min(newState.smallBlind, newState.players[sbIndex].chips);
    newState.players[sbIndex].chips -= sbAmount;
    newState.players[sbIndex].currentBet = sbAmount;
    newState.players[sbIndex].totalBetThisHand = sbAmount;

    const bbAmount = Math.min(newState.bigBlind, newState.players[bbIndex].chips);
    newState.players[bbIndex].chips -= bbAmount;
    newState.players[bbIndex].currentBet = bbAmount;
    newState.players[bbIndex].totalBetThisHand = bbAmount;

    if (newState.players[sbIndex].chips === 0) newState.players[sbIndex].isAllIn = true;
    if (newState.players[bbIndex].chips === 0) newState.players[bbIndex].isAllIn = true;

    newState.pot = sbAmount + bbAmount;
    newState.phase = 'preflop';
    newState.communityCards = [];
    newState.minRaise = newState.bigBlind;
    newState.lastRaiseAmount = newState.bigBlind;
    newState.actionCount = 0;

    // In HU preflop, dealer (SB) acts first
    newState.currentPlayerIndex = sbIndex;

    // If both players are all-in from blinds, run out the board
    if (newState.players[0].isAllIn && newState.players[1].isAllIn) {
      return this.runOutBoard(newState);
    }

    return newState;
  }

  /** Check if the current betting round is complete */
  private isBettingRoundComplete(state: TexasHoldemState): boolean {
    const p0 = state.players[0];
    const p1 = state.players[1];

    // If one player folded, the round is over
    if (p0.isFolded || p1.isFolded) return true;

    // If both are all-in, no more actions possible
    if (p0.isAllIn && p1.isAllIn) return true;

    // If one is all-in and the other has matched or exceeded their bet
    if (p0.isAllIn && p1.hasActed && p1.currentBet >= p0.currentBet) return true;
    if (p1.isAllIn && p0.hasActed && p0.currentBet >= p1.currentBet) return true;

    // Both have acted and bets are matched
    if (p0.hasActed && p1.hasActed && p0.currentBet === p1.currentBet) return true;

    return false;
  }

  /** Advance to the next phase */
  private advancePhase(state: TexasHoldemState): TexasHoldemState {
    const newState = deepClone(state);

    // Reset per-round state
    for (const player of newState.players) {
      player.currentBet = 0;
      player.hasActed = false;
    }
    newState.actionCount = 0;
    newState.minRaise = newState.bigBlind;
    newState.lastRaiseAmount = 0;

    // If both players are all-in, run out remaining community cards
    if (newState.players[0].isAllIn && newState.players[1].isAllIn) {
      return this.runOutBoard(newState);
    }

    const nextPhase: Record<string, BettingPhase> = {
      preflop: 'flop',
      flop: 'turn',
      turn: 'river',
      river: 'showdown',
    };

    newState.phase = nextPhase[newState.phase] || 'showdown';

    switch (newState.phase) {
      case 'flop':
        // Burn one, deal three
        newState.communityCards = [
          newState.deck[1],
          newState.deck[2],
          newState.deck[3],
        ];
        newState.deck = newState.deck.slice(4);
        break;
      case 'turn':
        // Burn one, deal one
        newState.communityCards = [...newState.communityCards, newState.deck[1]];
        newState.deck = newState.deck.slice(2);
        break;
      case 'river':
        // Burn one, deal one
        newState.communityCards = [...newState.communityCards, newState.deck[1]];
        newState.deck = newState.deck.slice(2);
        break;
      case 'showdown':
        return this.resolveShowdown(newState);
    }

    // Post-flop: non-dealer acts first
    newState.currentPlayerIndex = 1 - newState.dealerIndex;

    // If the first player is all-in, skip to the next
    if (newState.players[newState.currentPlayerIndex].isAllIn) {
      newState.players[newState.currentPlayerIndex].hasActed = true;
      if (newState.players[1 - newState.currentPlayerIndex].isAllIn) {
        // Both all-in, run out
        return this.runOutBoard(newState);
      }
      newState.currentPlayerIndex = 1 - newState.currentPlayerIndex;
    }

    return newState;
  }

  /** Run out remaining community cards (when both players are all-in) */
  private runOutBoard(state: TexasHoldemState): TexasHoldemState {
    const newState = deepClone(state);
    let deckIdx = 0;

    // Deal remaining community cards
    while (newState.communityCards.length < 5) {
      // Burn one
      deckIdx++;
      // Deal one
      newState.communityCards.push(newState.deck[deckIdx]);
      deckIdx++;
    }
    newState.deck = newState.deck.slice(deckIdx + 1);
    newState.phase = 'showdown';

    return this.resolveShowdown(newState);
  }

  /** Resolve showdown — compare hands and determine winner */
  private resolveShowdown(state: TexasHoldemState): TexasHoldemState {
    const newState = deepClone(state);
    const p0 = newState.players[0];
    const p1 = newState.players[1];

    const hand0 = evaluateHand([...p0.holeCards, ...newState.communityCards]);
    const hand1 = evaluateHand([...p1.holeCards, ...newState.communityCards]);

    const comparison = compareHands(hand0, hand1);

    let winnerId: string | null;
    if (comparison > 0) {
      winnerId = p0.id;
    } else if (comparison < 0) {
      winnerId = p1.id;
    } else {
      winnerId = null; // Draw — split pot
    }

    newState.handResult = {
      winnerId,
      pot: newState.pot,
      resultType: 'showdown',
      showdown: {
        playerCards: { [p0.id]: p0.holeCards, [p1.id]: p1.holeCards },
        communityCards: newState.communityCards,
        handRanks: { [p0.id]: hand0.rankName, [p1.id]: hand1.rankName },
      },
    };

    return this.resolveHandEnd(newState);
  }

  /** Called when a hand ends — distribute pot, check match end, deal next hand */
  private resolveHandEnd(state: TexasHoldemState): TexasHoldemState {
    const newState = deepClone(state);
    const result = newState.handResult!;

    if (result.winnerId) {
      // Winner takes the pot
      const winnerIdx = newState.players.findIndex((p) => p.id === result.winnerId);
      newState.players[winnerIdx].chips += newState.pot;
    } else {
      // Split pot
      const half = Math.floor(newState.pot / 2);
      newState.players[0].chips += half;
      newState.players[1].chips += newState.pot - half;
    }
    newState.pot = 0;

    // Check if match is over (a player has 0 chips)
    if (newState.players[0].chips <= 0 || newState.players[1].chips <= 0) {
      newState.isFinished = true;
      return newState;
    }

    // Rotate dealer for next hand
    newState.dealerIndex = 1 - newState.dealerIndex;

    // Deal next hand
    return this.dealNewHand(newState);
  }
}

/** Deep clone via JSON serialization (safe for pure data objects) */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
