// ============================================================
// REST API: Leaderboard Routes — SQLite backed
// ============================================================

import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app';
import { agents, users } from '../db/sqlite-schema';
import { desc, sql } from 'drizzle-orm';

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  const ctx = (app as any).ctx as AppContext;

  // GET /api/leaderboard — Get ranked leaderboard
  app.get('/', async (req, reply) => {
    const query = req.query as {
      game_type?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50', 10), 100);
    const offset = parseInt(query.offset || '0', 10);

    // Query agents from DB, sorted by rating descending
    const agentRows = ctx.db
      .select()
      .from(agents)
      .orderBy(desc(agents.rating))
      .limit(limit)
      .offset(offset)
      .all();

    // Also query human players
    const userRows = ctx.db
      .select()
      .from(users)
      .orderBy(desc(users.rating))
      .limit(limit)
      .all();

    // Merge and sort: agents + human players into unified leaderboard
    const entries = [
      ...agentRows.map(a => ({
        id: a.id,
        name: a.name,
        model_provider: a.modelProvider,
        model_name: a.modelName,
        rating: a.rating,
        total_games: a.totalGames,
        wins: a.wins,
        win_rate: a.totalGames > 0 ? Number((a.wins / a.totalGames).toFixed(3)) : 0,
        is_baseline: a.isBaseline,
        type: 'agent' as const,
      })),
      ...userRows.map(u => ({
        id: u.id,
        name: u.displayName,
        model_provider: null,
        model_name: '人类玩家',
        rating: u.rating,
        total_games: u.totalGames,
        wins: u.wins,
        win_rate: u.totalGames > 0 ? Number((u.wins / u.totalGames).toFixed(3)) : 0,
        is_baseline: false,
        type: 'human' as const,
      })),
    ]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map((entry, idx) => ({ rank: idx + 1 + offset, ...entry }));

    // Total count
    const agentCount = ctx.db.select({ count: sql<number>`count(*)` }).from(agents).get();
    const userCount = ctx.db.select({ count: sql<number>`count(*)` }).from(users).get();
    const total = (agentCount?.count || 0) + (userCount?.count || 0);

    return reply.send({
      game_type: query.game_type || 'texas_holdem_hu',
      total,
      limit,
      offset,
      entries,
    });
  });

  // GET /api/leaderboard/by-provider — Grouped by model provider
  app.get('/by-provider', async (_req, reply) => {
    const rows = ctx.db
      .select()
      .from(agents)
      .orderBy(desc(agents.rating))
      .all();

    const providers = new Map<string, { provider: string; agent_count: number; avg_rating: number; best_agent: string; best_rating: number }>();

    for (const entry of rows) {
      const providerName = entry.modelProvider || '官方';
      if (!providers.has(providerName)) {
        providers.set(providerName, {
          provider: providerName,
          agent_count: 0,
          avg_rating: 0,
          best_agent: entry.name,
          best_rating: entry.rating,
        });
      }
      const p = providers.get(providerName)!;
      p.agent_count++;
      p.avg_rating = Math.round(
        ((p.avg_rating * (p.agent_count - 1)) + entry.rating) / p.agent_count,
      );
      if (entry.rating > p.best_rating) {
        p.best_agent = entry.name;
        p.best_rating = entry.rating;
      }
    }

    return reply.send({
      providers: [...providers.values()].sort((a, b) => b.best_rating - a.best_rating),
    });
  });
}
