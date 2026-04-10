"""
示例 Agent — 随机策略
Example Agent — Random Strategy
"""

import random
from carbon_arena import BaseAgent, GameState, Action


class RandomAgent(BaseAgent):
    """随机 Agent — 从合法动作中随机选择"""

    def decide(self, state: GameState, legal_actions: list[Action]) -> Action:
        return random.choice(legal_actions)


class SimpleRuleAgent(BaseAgent):
    """
    简单规则 Agent — 基于手牌强度的基础策略

    策略：
    - 高牌对子：加注
    - 中等手牌：跟注
    - 弱牌：弃牌
    """

    def decide(self, state: GameState, legal_actions: list[Action]) -> Action:
        # Evaluate hand strength
        strength = self._evaluate_hand(state)

        action_types = {a.type.value for a in legal_actions}

        # Strong hand: raise or bet
        if strength > 0.7:
            for a in legal_actions:
                if a.type.value in ("raise", "bet"):
                    return a
            if "call" in action_types:
                return Action.call()
            if "check" in action_types:
                return Action.check()

        # Medium hand: call or check
        if strength > 0.4:
            if "check" in action_types:
                return Action.check()
            if "call" in action_types:
                return Action.call()
            return Action.fold()

        # Weak hand: check or fold
        if "check" in action_types:
            return Action.check()
        return Action.fold()

    def _evaluate_hand(self, state: GameState) -> float:
        """简单手牌评估 (0-1)"""
        if not state.your_cards:
            return 0.3

        rank_values = {
            "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
            "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
        }

        r1 = rank_values.get(state.your_cards[0].rank, 5)
        r2 = rank_values.get(state.your_cards[1].rank, 5)
        suited = state.your_cards[0].suit == state.your_cards[1].suit

        score = (r1 + r2) / 28.0
        if r1 == r2:
            score += 0.2
        if suited:
            score += 0.05

        return min(score, 1.0)


if __name__ == "__main__":
    import sys

    agent_type = sys.argv[1] if len(sys.argv) > 1 else "random"
    api_key = sys.argv[2] if len(sys.argv) > 2 else "csa_ak_test"
    server = sys.argv[3] if len(sys.argv) > 3 else "ws://localhost:3001/ws/agent"

    if agent_type == "rule":
        agent = SimpleRuleAgent(api_key=api_key, server_url=server)
    else:
        agent = RandomAgent(api_key=api_key, server_url=server)

    print(f"Starting {agent_type} agent...")
    agent.run()
