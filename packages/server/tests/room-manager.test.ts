import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/services/room-manager';

describe('RoomManager', () => {
  it('should create and retrieve a room', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('texas_holdem_hu', 'ranked');
    expect(room.id).toBeTruthy();
    expect(room.gameType).toBe('texas_holdem_hu');
    expect(room.status).toBe('waiting');

    const retrieved = rm.getRoom(room.id);
    expect(retrieved).toBe(room);
  });

  it('should join players to a room', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('texas_holdem_hu', 'ranked');

    rm.joinRoom(room.id, { agentId: 'a1', agentName: 'bot1', rating: 1500, ws: null, sessionId: 's1' });
    expect(room.players).toHaveLength(1);

    rm.joinRoom(room.id, { agentId: 'a2', agentName: 'bot2', rating: 1600, ws: null, sessionId: 's2' });
    expect(room.players).toHaveLength(2);
  });

  it('should reject third player', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('texas_holdem_hu', 'ranked');
    rm.joinRoom(room.id, { agentId: 'a1', agentName: 'bot1', rating: 1500, ws: null, sessionId: 's1' });
    rm.joinRoom(room.id, { agentId: 'a2', agentName: 'bot2', rating: 1600, ws: null, sessionId: 's2' });

    expect(() => {
      rm.joinRoom(room.id, { agentId: 'a3', agentName: 'bot3', rating: 1400, ws: null, sessionId: 's3' });
    }).toThrow('full');
  });

  it('should prevent agent from joining two rooms', () => {
    const rm = new RoomManager();
    const room1 = rm.createRoom('texas_holdem_hu', 'ranked');
    const room2 = rm.createRoom('texas_holdem_hu', 'ranked');

    rm.joinRoom(room1.id, { agentId: 'a1', agentName: 'bot1', rating: 1500, ws: null, sessionId: 's1' });

    expect(() => {
      rm.joinRoom(room2.id, { agentId: 'a1', agentName: 'bot1', rating: 1500, ws: null, sessionId: 's1' });
    }).toThrow('already in a room');
  });

  it('should detect room readiness', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('texas_holdem_hu', 'ranked');

    expect(rm.isRoomReady(room.id)).toBe(false);
    rm.joinRoom(room.id, { agentId: 'a1', agentName: 'bot1', rating: 1500, ws: null, sessionId: 's1' });
    expect(rm.isRoomReady(room.id)).toBe(false);
    rm.joinRoom(room.id, { agentId: 'a2', agentName: 'bot2', rating: 1600, ws: null, sessionId: 's2' });
    expect(rm.isRoomReady(room.id)).toBe(true);
  });

  it('should handle leave and cleanup', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('texas_holdem_hu', 'ranked');
    rm.joinRoom(room.id, { agentId: 'a1', agentName: 'bot1', rating: 1500, ws: null, sessionId: 's1' });

    rm.leaveRoom('a1');
    // Room should be deleted when empty
    expect(rm.getRoom(room.id)).toBeUndefined();
  });

  it('should list active rooms', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('texas_holdem_hu', 'ranked');
    rm.joinRoom(room.id, { agentId: 'a1', agentName: 'bot1', rating: 1500, ws: null, sessionId: 's1' });
    rm.joinRoom(room.id, { agentId: 'a2', agentName: 'bot2', rating: 1600, ws: null, sessionId: 's2' });

    expect(rm.getActiveRooms()).toHaveLength(0);
    rm.startRoom(room.id, 'match_1');
    expect(rm.getActiveRooms()).toHaveLength(1);
  });

  it('should generate invite code for private rooms', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('texas_holdem_hu', 'private');
    expect(room.inviteCode).toBeTruthy();
    expect(room.inviteCode!.length).toBe(6);
  });
});
