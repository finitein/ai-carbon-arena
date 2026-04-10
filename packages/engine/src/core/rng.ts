// ============================================================
// Deterministic RNG — xoshiro128** algorithm
// ============================================================
// Produces the same sequence for the same seed, enabling
// deterministic replay and snapshot/restore.

/**
 * Deterministic pseudo-random number generator based on xoshiro128**.
 * Given the same seed, the sequence of outputs is always identical.
 */
export class DeterministicRNG {
  private state: [number, number, number, number];

  constructor(seed: number) {
    // Initialize state using splitmix32 to spread the seed
    this.state = [0, 0, 0, 0];
    let s = seed | 0;
    for (let i = 0; i < 4; i++) {
      s += 0x9e3779b9;
      let t = s ^ (s >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t ^= t >>> 15;
      t = Math.imul(t, 0x735a2d97);
      t ^= t >>> 15;
      this.state[i] = t >>> 0;
    }
  }

  /** Return state snapshot for serialization */
  getState(): [number, number, number, number] {
    return [...this.state];
  }

  /** Restore state from a previous snapshot */
  setState(state: [number, number, number, number]): void {
    this.state = [...state];
  }

  /** Generate next unsigned 32-bit integer */
  private next(): number {
    const result = Math.imul(this.state[1] * 5, 7);
    const rotated = ((result << 7) | (result >>> 25)) >>> 0;
    const t = this.state[1] << 9;

    this.state[2] ^= this.state[0];
    this.state[3] ^= this.state[1];
    this.state[1] ^= this.state[2];
    this.state[0] ^= this.state[3];
    this.state[2] ^= t;
    this.state[3] = ((this.state[3] << 11) | (this.state[3] >>> 21)) >>> 0;

    return rotated >>> 0;
  }

  /** Return a random integer in [0, max) */
  nextInt(max: number): number {
    if (max <= 0) throw new Error('max must be positive');
    return this.next() % max;
  }

  /** Return a random integer in [min, max) */
  nextIntRange(min: number, max: number): number {
    return min + this.nextInt(max - min);
  }

  /** Return a random float in [0, 1) */
  nextFloat(): number {
    return this.next() / 0x100000000;
  }

  /**
   * Fisher-Yates shuffle — returns a NEW shuffled array.
   * Does not mutate the input.
   */
  shuffle<T>(array: ReadonlyArray<T>): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
