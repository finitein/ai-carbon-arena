import { describe, it, expect } from 'vitest';
import { encode, decode, createMessage, ValidationError } from '../src/codec';
import { SequenceManager, MessageBuffer } from '../src/sequence';

describe('Codec', () => {
  describe('encode', () => {
    it('should encode a message to JSON string', () => {
      const msg = createMessage('server_hello', 1, {
        session_id: 'sess_123',
        server_epoch: 1,
        agent_id: 'agent_123',
        protocol_version: '1.0',
        heartbeat_interval_ms: 30000,
        server_time: new Date().toISOString(),
      });
      const json = encode(msg);
      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('server_hello');
      expect(parsed.seq).toBe(1);
    });
  });

  describe('decode', () => {
    it('should decode a valid client_hello', () => {
      const raw = JSON.stringify({
        type: 'client_hello',
        seq: 1,
        timestamp: new Date().toISOString(),
        payload: {
          api_key: 'csa_ak_test123',
          protocol_version: '1.0',
          agent_name: 'test-agent',
        },
      });
      const msg = decode(raw);
      expect(msg.type).toBe('client_hello');
      expect(msg.seq).toBe(1);
    });

    it('should reject invalid JSON', () => {
      expect(() => decode('not json')).toThrow(ValidationError);
    });

    it('should reject missing type', () => {
      const raw = JSON.stringify({ seq: 1, timestamp: '2026-01-01', payload: {} });
      expect(() => decode(raw)).toThrow(ValidationError);
    });

    it('should reject invalid seq', () => {
      const raw = JSON.stringify({
        type: 'heartbeat',
        seq: 0,
        timestamp: '2026-01-01',
        payload: {},
      });
      expect(() => decode(raw)).toThrow(ValidationError);
    });

    it('should reject unknown message type', () => {
      const raw = JSON.stringify({
        type: 'hacker_attack',
        seq: 1,
        timestamp: '2026-01-01',
        payload: {},
      });
      expect(() => decode(raw)).toThrow(ValidationError);
    });

    it('should strip unknown payload fields (additionalProperties: false)', () => {
      const raw = JSON.stringify({
        type: 'game_action',
        seq: 1,
        timestamp: new Date().toISOString(),
        payload: {
          room_id: 'room_123',
          hand_num: 1,
          action: 'fold',
          malicious_field: 'injected!',
          another_hack: 42,
        },
      });
      const msg = decode(raw);
      const payload = msg.payload as Record<string, unknown>;
      expect(payload.malicious_field).toBeUndefined();
      expect(payload.another_hack).toBeUndefined();
      expect(payload.action).toBe('fold');
    });

    it('should validate game_action payload', () => {
      const raw = JSON.stringify({
        type: 'game_action',
        seq: 1,
        timestamp: new Date().toISOString(),
        payload: {
          room_id: 'room_123',
          hand_num: 1,
          action: 'invalid_action',
        },
      });
      expect(() => decode(raw)).toThrow(ValidationError);
    });

    it('should require amount for raise/bet actions', () => {
      const raw = JSON.stringify({
        type: 'game_action',
        seq: 1,
        timestamp: new Date().toISOString(),
        payload: {
          room_id: 'room_123',
          hand_num: 1,
          action: 'raise',
          // amount is missing
        },
      });
      expect(() => decode(raw)).toThrow(ValidationError);
    });
  });
});

describe('SequenceManager', () => {
  it('should increment sequence numbers', () => {
    const seq = new SequenceManager();
    expect(seq.next()).toBe(1);
    expect(seq.next()).toBe(2);
    expect(seq.current()).toBe(2);
  });

  it('should support reset', () => {
    const seq = new SequenceManager();
    seq.next(); seq.next(); seq.next();
    seq.reset(10);
    expect(seq.next()).toBe(11);
  });
});

describe('MessageBuffer', () => {
  it('should store and retrieve messages after seq', () => {
    const buf = new MessageBuffer<string>();
    buf.push(1, 'msg1');
    buf.push(2, 'msg2');
    buf.push(3, 'msg3');

    expect(buf.getAfter(1)).toEqual(['msg2', 'msg3']);
    expect(buf.getAfter(2)).toEqual(['msg3']);
    expect(buf.getAfter(3)).toEqual([]);
  });

  it('should evict old entries when exceeding max size', () => {
    const buf = new MessageBuffer<number>(3);
    buf.push(1, 100);
    buf.push(2, 200);
    buf.push(3, 300);
    buf.push(4, 400); // evicts seq 1

    expect(buf.getAfter(0)).toEqual([200, 300, 400]);
  });
});
