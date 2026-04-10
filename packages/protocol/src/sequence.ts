// ============================================================
// Sequence ID manager + message buffer for reconnection
// ============================================================

/** Manages monotonically increasing sequence numbers */
export class SequenceManager {
  private seq: number;

  constructor(startSeq = 0) {
    this.seq = startSeq;
  }

  /** Get the next sequence number */
  next(): number {
    return ++this.seq;
  }

  /** Get the current (last used) sequence number */
  current(): number {
    return this.seq;
  }

  /** Reset to a specific sequence number (for reconnection) */
  reset(seq: number): void {
    this.seq = seq;
  }
}

/** Circular buffer for storing recent messages (for reconnection replay) */
export class MessageBuffer<T> {
  private readonly buffer: Array<{ seq: number; message: T }> = [];
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  /** Add a message to the buffer */
  push(seq: number, message: T): void {
    this.buffer.push({ seq, message });
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /** Get all messages after a given sequence number */
  getAfter(lastSeenSeq: number): T[] {
    return this.buffer
      .filter((entry) => entry.seq > lastSeenSeq)
      .map((entry) => entry.message);
  }

  /** Get the latest sequence number in the buffer */
  getLatestSeq(): number {
    if (this.buffer.length === 0) return 0;
    return this.buffer[this.buffer.length - 1].seq;
  }

  /** Clear the buffer */
  clear(): void {
    this.buffer.length = 0;
  }
}
