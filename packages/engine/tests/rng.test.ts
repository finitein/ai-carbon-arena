import { describe, it, expect } from 'vitest';
import { DeterministicRNG } from '../src/core/rng';

describe('DeterministicRNG', () => {
  it('should produce the same sequence for the same seed', () => {
    const rng1 = new DeterministicRNG(42);
    const rng2 = new DeterministicRNG(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1.nextInt(1000)).toBe(rng2.nextInt(1000));
    }
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = new DeterministicRNG(42);
    const rng2 = new DeterministicRNG(123);

    const seq1: number[] = [];
    const seq2: number[] = [];
    for (let i = 0; i < 10; i++) {
      seq1.push(rng1.nextInt(1000));
      seq2.push(rng2.nextInt(1000));
    }

    expect(seq1).not.toEqual(seq2);
  });

  it('should shuffle deterministically', () => {
    const rng1 = new DeterministicRNG(42);
    const rng2 = new DeterministicRNG(42);

    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(rng1.shuffle(arr)).toEqual(rng2.shuffle(arr));
  });

  it('should not mutate the original array when shuffling', () => {
    const rng = new DeterministicRNG(42);
    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    rng.shuffle(original);
    expect(original).toEqual(originalCopy);
  });

  it('should support state snapshot and restore', () => {
    const rng1 = new DeterministicRNG(42);

    // Generate a few random values
    for (let i = 0; i < 5; i++) rng1.nextInt(1000);

    // Save state
    const snapshot = rng1.getState();

    // Generate more values
    const values1: number[] = [];
    for (let i = 0; i < 10; i++) values1.push(rng1.nextInt(1000));

    // Restore state and expect same values
    const rng2 = new DeterministicRNG(0);
    rng2.setState(snapshot);

    const values2: number[] = [];
    for (let i = 0; i < 10; i++) values2.push(rng2.nextInt(1000));

    expect(values1).toEqual(values2);
  });

  it('should return values in [0, max)', () => {
    const rng = new DeterministicRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
    }
  });

  it('nextFloat should return values in [0, 1)', () => {
    const rng = new DeterministicRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextFloat();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});
