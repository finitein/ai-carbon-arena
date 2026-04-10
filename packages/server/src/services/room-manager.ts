// ============================================================
// Room Manager — in-memory room state management
// ============================================================

import { v4 as uuidv4 } from 'uuid';

/** Get the required number of players for a game type */
export function getRequiredPlayers(gameType: string): number {
  switch (gameType) {
    case 'heist_royale': return 6;
    default: return 2;
  }
}

/** Minimal WebSocket-like interface for type-safe send */
export interface WsLike {
  send(data: string): void;
  readyState: number;
}

export interface RoomPlayer {
  agentId: string;
  agentName: string;
  rating: number;
  ws: WsLike | null; // WebSocket connection (null for bots)
  sessionId: string;
}

export interface Room {
  id: string;
  gameType: string;
  type: 'ranked' | 'private';
  config: {
    startingStack: number;
    smallBlind: number;
    bigBlind: number;
    actionTimeoutMs: number;
  };
  players: RoomPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  matchId?: string;
  createdAt: Date;
  inviteCode?: string;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private agentToRoom: Map<string, string> = new Map();

  /** Create a new room */
  createRoom(
    gameType: string,
    type: 'ranked' | 'private',
    config?: Partial<Room['config']>,
  ): Room {
    const room: Room = {
      id: uuidv4(),
      gameType,
      type,
      config: {
        startingStack: config?.startingStack || 10000,
        smallBlind: config?.smallBlind || 50,
        bigBlind: config?.bigBlind || 100,
        actionTimeoutMs: config?.actionTimeoutMs || 30000,
      },
      players: [],
      status: 'waiting',
      createdAt: new Date(),
      inviteCode: type === 'private' ? this.generateInviteCode() : undefined,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  /** Add a player to a room */
  joinRoom(roomId: string, player: RoomPlayer): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    const maxPlayers = getRequiredPlayers(room.gameType);
    if (room.players.length >= maxPlayers) throw new Error(`Room ${roomId} is full (${maxPlayers})`);
    if (this.agentToRoom.has(player.agentId)) {
      throw new Error(`Agent ${player.agentId} is already in a room`);
    }

    room.players.push(player);
    this.agentToRoom.set(player.agentId, roomId);

    return room;
  }

  /** Remove a player from their room */
  leaveRoom(agentId: string): void {
    const roomId = this.agentToRoom.get(agentId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter((p) => p.agentId !== agentId);
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
      }
    }
    this.agentToRoom.delete(agentId);
  }

  /** Get room by ID */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /** Get room by agent ID */
  getRoomByAgent(agentId: string): Room | undefined {
    const roomId = this.agentToRoom.get(agentId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /** Check if a room is full and ready to start */
  isRoomReady(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return false;
    return room.players.length >= getRequiredPlayers(room.gameType);
  }

  /** Mark room as playing */
  startRoom(roomId: string, matchId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'playing';
      room.matchId = matchId;
    }
  }

  /** Mark room as finished */
  finishRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'finished';
      for (const player of room.players) {
        this.agentToRoom.delete(player.agentId);
      }
    }
  }

  /** Get all active (playing) rooms */
  getActiveRooms(): Room[] {
    return [...this.rooms.values()].filter((r) => r.status === 'playing');
  }

  /** Get all rooms */
  getAllRooms(): Room[] {
    return [...this.rooms.values()];
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
