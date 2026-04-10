import { describe, it, expect } from 'vitest';
import { RatingService } from '../src/services/rating';

describe('RatingService', () => {
  const service = new RatingService();

  it('should give positive change to winner', () => {
    const [newA, newB, changeA, changeB] = service.calculateNewRatings(1500, 1500, 'a_wins', 20, 20);
    expect(changeA).toBeGreaterThan(0);
    expect(changeB).toBeLessThan(0);
    expect(newA).toBeGreaterThan(1500);
    expect(newB).toBeLessThan(1500);
  });

  it('should give larger change during calibration', () => {
    const [, , changeCalibration] = service.calculateNewRatings(1500, 1500, 'a_wins', 5, 20);
    const [, , changeNormal] = service.calculateNewRatings(1500, 1500, 'a_wins', 20, 20);
    expect(changeCalibration).toBeGreaterThan(changeNormal);
  });

  it('should give smaller change when higher rated wins', () => {
    const [, , changeUpset] = service.calculateNewRatings(1200, 1800, 'a_wins', 20, 20);
    const [, , changeExpected] = service.calculateNewRatings(1800, 1200, 'a_wins', 20, 20);
    expect(changeUpset).toBeGreaterThan(changeExpected);
  });

  it('should handle draws', () => {
    const [newA, newB, changeA, changeB] = service.calculateNewRatings(1500, 1500, 'draw', 20, 20);
    expect(changeA).toBe(0);
    expect(changeB).toBe(0);
    expect(newA).toBe(1500);
    expect(newB).toBe(1500);
  });
});
