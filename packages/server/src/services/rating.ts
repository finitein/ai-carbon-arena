// ============================================================
// ELO Rating Service — with league-split ranking (V2-W1/W3)
// ============================================================

export type League = 'whitebox' | 'blackbox';

export interface RatingEntry {
  agentId: string;
  rating: number;
  games: number;
  wins: number;
  league: League;
}

export class RatingService {
  private readonly K_FACTOR = 32;
  private readonly CALIBRATION_K_FACTOR = 64; // Higher K for first 10 games
  private readonly CALIBRATION_GAMES = 10;

  /** In-memory league-split ratings */
  private ratings = new Map<string, RatingEntry>();

  /**
   * Calculate new ratings after a match.
   * Returns [newRatingA, newRatingB, changeA, changeB]
   */
  calculateNewRatings(
    ratingA: number,
    ratingB: number,
    result: 'a_wins' | 'b_wins' | 'draw',
    gamesA: number,
    gamesB: number,
  ): [number, number, number, number] {
    const expectedA = this.expectedScore(ratingA, ratingB);
    const expectedB = 1 - expectedA;

    let actualA: number;
    let actualB: number;
    switch (result) {
      case 'a_wins':
        actualA = 1;
        actualB = 0;
        break;
      case 'b_wins':
        actualA = 0;
        actualB = 1;
        break;
      case 'draw':
        actualA = 0.5;
        actualB = 0.5;
        break;
    }

    const kA = gamesA < this.CALIBRATION_GAMES ? this.CALIBRATION_K_FACTOR : this.K_FACTOR;
    const kB = gamesB < this.CALIBRATION_GAMES ? this.CALIBRATION_K_FACTOR : this.K_FACTOR;

    const changeA = Math.round(kA * (actualA - expectedA));
    const changeB = Math.round(kB * (actualB - expectedB));

    const newRatingA = ratingA + changeA;
    const newRatingB = ratingB + changeB;

    return [newRatingA, newRatingB, changeA, changeB];
  }

  /** Get or create a rating entry for an agent in a league */
  getOrCreate(agentId: string, league: League): RatingEntry {
    const key = `${agentId}:${league}`;
    if (!this.ratings.has(key)) {
      this.ratings.set(key, {
        agentId,
        rating: 1500,
        games: 0,
        wins: 0,
        league,
      });
    }
    return this.ratings.get(key)!;
  }

  /** Update ratings after a match with league tracking */
  recordMatchResult(
    agentA: string,
    agentB: string,
    result: 'a_wins' | 'b_wins' | 'draw',
    league: League,
  ): { changeA: number; changeB: number } {
    const entryA = this.getOrCreate(agentA, league);
    const entryB = this.getOrCreate(agentB, league);

    const [newA, newB, changeA, changeB] = this.calculateNewRatings(
      entryA.rating, entryB.rating, result, entryA.games, entryB.games,
    );

    entryA.rating = newA;
    entryB.rating = newB;
    entryA.games++;
    entryB.games++;
    if (result === 'a_wins') entryA.wins++;
    if (result === 'b_wins') entryB.wins++;

    return { changeA, changeB };
  }

  /** Get leaderboard for a specific league */
  getLeaderboard(league: League): RatingEntry[] {
    return [...this.ratings.values()]
      .filter(e => e.league === league)
      .sort((a, b) => b.rating - a.rating);
  }

  /** Get combined leaderboard with league labels */
  getCombinedLeaderboard(): (RatingEntry & { ratingLabel: string })[] {
    return [...this.ratings.values()]
      .sort((a, b) => b.rating - a.rating)
      .map(e => ({
        ...e,
        ratingLabel: e.league === 'whitebox' ? `${e.rating} [W]` : `${e.rating}`,
      }));
  }

  /** Calculate expected score using ELO formula */
  private expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }
}
