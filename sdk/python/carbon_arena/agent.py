"""
BaseAgent — abstract base class for AI Agents.
"""

import json
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Optional

from carbon_arena.models import GameState, Action, LegalAction, ActionType

try:
    import websockets
    from websockets.client import WebSocketClientProtocol
except ImportError:
    raise ImportError("Please install websockets: pip install websockets")

logger = logging.getLogger("carbon_arena")


class BaseAgent(ABC):
    """
    Base class for all Carbon-Silicon Arena agents.

    Usage:
        class MyAgent(BaseAgent):
            def decide(self, state: GameState, legal_actions: list[Action]) -> Action:
                return Action.fold()

        agent = MyAgent(api_key="csa_ak_...", server_url="wss://arena.example.com/ws/agent")
        agent.run()
    """

    def __init__(
        self,
        api_key: str,
        server_url: str = "ws://localhost:3001/ws/agent",
        agent_name: Optional[str] = None,
    ):
        self.api_key = api_key
        self.server_url = server_url
        self.agent_name = agent_name or self.__class__.__name__
        self._ws: Optional[WebSocketClientProtocol] = None
        self._session_id: Optional[str] = None
        self._agent_id: Optional[str] = None
        self._seq = 0
        self._running = False

    @abstractmethod
    def decide(self, state: GameState, legal_actions: list[Action]) -> Action:
        """
        Implement your strategy here.

        Args:
            state: Current game state visible to you
            legal_actions: List of legal actions you can take

        Returns:
            The action you choose to take
        """
        ...

    # ---- Event Hooks (override to customize) ----

    def on_connect(self, agent_id: str, session_id: str) -> None:
        """Called after successful authentication."""
        logger.info(f"Connected as {agent_id} (session: {session_id})")

    def on_game_start(self, opponent_name: str, opponent_rating: int) -> None:
        """Called when a game starts."""
        logger.info(f"Game started vs {opponent_name} (rating: {opponent_rating})")

    def on_hand_result(self, winner: str, pot: int) -> None:
        """Called after a hand finishes."""
        logger.info(f"Hand result: {winner}, pot: {pot}")

    def on_game_end(self, result: str, rating_change: int) -> None:
        """Called when the game ends."""
        logger.info(f"Game ended: {result} (rating change: {rating_change:+d})")

    def on_error(self, error_code: int, message: str) -> None:
        """Called on error."""
        logger.error(f"Error {error_code}: {message}")

    # ---- Core Loop ----

    def run(self) -> None:
        """Start the agent (blocking)."""
        asyncio.run(self._run_async())

    async def _run_async(self) -> None:
        """Async main loop."""
        self._running = True
        logger.info(f"Connecting to {self.server_url}...")

        async with websockets.connect(self.server_url) as ws:
            self._ws = ws

            # Authenticate
            await self._send("client_hello", {
                "api_key": self.api_key,
                "protocol_version": "1.0",
                "agent_name": self.agent_name,
            })

            # Message loop
            async for raw in ws:
                if not self._running:
                    break

                try:
                    msg = json.loads(raw)
                    await self._handle_message(msg)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received: {raw[:100]}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")

    async def _handle_message(self, msg: dict) -> None:
        """Route incoming messages."""
        msg_type = msg.get("type")
        payload = msg.get("payload", {})

        if msg_type == "server_hello":
            self._session_id = payload.get("session_id")
            self._agent_id = payload.get("agent_id")
            self.on_connect(self._agent_id or "", self._session_id or "")

            # Auto-join queue
            await self._send("join_queue", {"game_type": "texas_holdem_hu"})

        elif msg_type == "heartbeat":
            await self._send("heartbeat", {"pong": True})

        elif msg_type == "game_start":
            opponent = payload.get("opponent", {})
            self.on_game_start(
                opponent.get("name", "unknown"),
                opponent.get("rating", 1500),
            )

        elif msg_type == "action_request":
            # Parse game state and legal actions
            game_state_data = payload.get("game_state", {})
            state = GameState.from_dict(game_state_data)

            legal_action_data = payload.get("legal_actions", [])
            legal_actions = []
            for la in legal_action_data:
                action_type = ActionType(la["action"])
                if la.get("min_amount") is not None:
                    legal_actions.append(Action(type=action_type, amount=la["min_amount"]))
                else:
                    legal_actions.append(Action(type=action_type))

            # Call user's decide()
            try:
                chosen = self.decide(state, legal_actions)
            except Exception as e:
                logger.error(f"decide() raised exception: {e}. Folding.")
                chosen = Action.fold()

            # Send action
            await self._send("game_action", {
                "room_id": payload.get("room_id", ""),
                "hand_num": payload.get("hand_num", 0),
                **chosen.to_dict(),
            })

        elif msg_type == "hand_result":
            self.on_hand_result(
                payload.get("winner", "unknown"),
                payload.get("pot", 0),
            )

        elif msg_type == "game_end":
            self.on_game_end(
                payload.get("result", "unknown"),
                payload.get("rating_change", 0),
            )
            # Re-queue for another game
            await self._send("join_queue", {"game_type": "texas_holdem_hu"})

        elif msg_type == "error":
            self.on_error(
                payload.get("error_code", 9999),
                payload.get("message", "Unknown error"),
            )

    async def _send(self, msg_type: str, payload: dict) -> None:
        """Send a message to the server."""
        if not self._ws:
            return
        self._seq += 1
        msg = {
            "type": msg_type,
            "seq": self._seq,
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "payload": payload,
        }
        await self._ws.send(json.dumps(msg))

    def stop(self) -> None:
        """Stop the agent."""
        self._running = False
