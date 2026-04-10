"""
Data models for the Carbon-Silicon Arena SDK.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ActionType(str, Enum):
    """Legal action types in Texas Hold'em."""
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    BET = "bet"
    RAISE = "raise"


@dataclass
class Card:
    """A playing card with rank and suit."""
    rank: str  # '2'-'9', 'T', 'J', 'Q', 'K', 'A'
    suit: str  # 'h', 'd', 'c', 's'

    def __str__(self) -> str:
        return f"{self.rank}{self.suit}"

    @classmethod
    def from_str(cls, s: str) -> "Card":
        return cls(rank=s[0], suit=s[1])


@dataclass
class Action:
    """An action that an agent can take."""
    type: ActionType
    amount: Optional[int] = None

    @classmethod
    def fold(cls) -> "Action":
        return cls(type=ActionType.FOLD)

    @classmethod
    def check(cls) -> "Action":
        return cls(type=ActionType.CHECK)

    @classmethod
    def call(cls) -> "Action":
        return cls(type=ActionType.CALL)

    @classmethod
    def bet(cls, amount: int) -> "Action":
        return cls(type=ActionType.BET, amount=amount)

    @classmethod
    def raise_to(cls, amount: int) -> "Action":
        return cls(type=ActionType.RAISE, amount=amount)

    def to_dict(self) -> dict:
        d = {"action": self.type.value}
        if self.amount is not None:
            d["amount"] = self.amount
        return d


@dataclass
class LegalAction:
    """A legal action with optional min/max amounts."""
    action: ActionType
    min_amount: Optional[int] = None
    max_amount: Optional[int] = None


@dataclass
class GameState:
    """Current game state visible to the agent."""
    hand_num: int
    round: str  # 'preflop', 'flop', 'turn', 'river'
    your_cards: list[Card] = field(default_factory=list)
    community_cards: list[Card] = field(default_factory=list)
    pot: int = 0
    your_stack: int = 0
    opponent_stack: int = 0
    your_bet_this_round: int = 0
    opponent_bet_this_round: int = 0
    dealer: str = ""  # 'you' or 'opponent'
    legal_actions: list[LegalAction] = field(default_factory=list)
    is_finished: bool = False

    @classmethod
    def from_dict(cls, data: dict) -> "GameState":
        your_cards = [Card.from_str(c) for c in data.get("your_cards", data.get("yourCards", []))]
        community_cards = [Card.from_str(c) for c in data.get("community_cards", data.get("communityCards", []))]

        legal_actions = []
        for la in data.get("legal_actions", []):
            legal_actions.append(LegalAction(
                action=ActionType(la["action"]),
                min_amount=la.get("min_amount"),
                max_amount=la.get("max_amount"),
            ))

        return cls(
            hand_num=data.get("hand_num", data.get("handNum", 0)),
            round=data.get("round", data.get("phase", "preflop")),
            your_cards=your_cards,
            community_cards=community_cards,
            pot=data.get("pot", 0),
            your_stack=data.get("your_stack", data.get("yourStack", 0)),
            opponent_stack=data.get("opponent_stack", data.get("opponentStack", 0)),
            your_bet_this_round=data.get("your_bet_this_round", data.get("yourBetThisRound", 0)),
            opponent_bet_this_round=data.get("opponent_bet_this_round", data.get("opponentBetThisRound", 0)),
            dealer=data.get("dealer", ""),
            legal_actions=legal_actions,
            is_finished=data.get("is_finished", data.get("isFinished", False)),
        )
