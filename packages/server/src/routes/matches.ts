// ============================================================
// REST API: Match History Routes — SQLite backed
// ============================================================

import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app';
import { matches, agents } from '../db/sqlite-schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function matchRoutes(app: FastifyInstance): Promise<void> {
  const ctx = (app as any).ctx as AppContext;

  // GET /api/matches — List matches
  app.get('/', async (req, reply) => {
    const query = req.query as {
      status?: string;
      agent_id?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '20', 10), 50);
    const offset = parseInt(query.offset || '0', 10);

    // Build query
    let whereClause = sql`1=1`;
    if (query.status) {
      whereClause = sql`${whereClause} AND ${matches.status} = ${query.status}`;
    }
    if (query.agent_id) {
      whereClause = sql`${whereClause} AND (${matches.playerAId} = ${query.agent_id} OR ${matches.playerBId} = ${query.agent_id})`;
    }

    const rows = ctx.db
      .select()
      .from(matches)
      .where(whereClause)
      .orderBy(desc(matches.startedAt))
      .limit(limit)
      .offset(offset)
      .all();

    // Get total count
    const countResult = ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .where(whereClause)
      .get();

    // Resolve player names
    const matchList = rows.map(m => {
      const playerA = ctx.db.select().from(agents).where(eq(agents.id, m.playerAId)).get();
      const playerB = ctx.db.select().from(agents).where(eq(agents.id, m.playerBId)).get();
      const winner = m.winnerId
        ? ctx.db.select().from(agents).where(eq(agents.id, m.winnerId)).get()
        : null;

      return {
        id: m.id,
        game_type: m.gameType,
        status: m.status,
        player_a: {
          id: m.playerAId,
          name: playerA?.name || m.playerAId,
          rating: m.ratingABefore || playerA?.rating || 1500,
        },
        player_b: {
          id: m.playerBId,
          name: playerB?.name || m.playerBId,
          rating: m.ratingBBefore || playerB?.rating || 1500,
        },
        winner: winner ? { id: winner.id, name: winner.name } : null,
        total_hands: m.totalHands,
        rating_change_a: m.ratingChangeA,
        rating_change_b: m.ratingChangeB,
        started_at: m.startedAt,
        ended_at: m.endedAt,
      };
    });

    return reply.send({
      total: countResult?.count || 0,
      limit,
      offset,
      matches: matchList,
    });
  });

  // GET /api/matches/:id — Get match details
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const m = ctx.db.select().from(matches).where(eq(matches.id, id)).get();

    if (!m) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: '未找到该对局' });
    }

    const playerA = ctx.db.select().from(agents).where(eq(agents.id, m.playerAId)).get();
    const playerB = ctx.db.select().from(agents).where(eq(agents.id, m.playerBId)).get();
    const winner = m.winnerId
      ? ctx.db.select().from(agents).where(eq(agents.id, m.winnerId)).get()
      : null;

    return reply.send({
      id: m.id,
      game_type: m.gameType,
      status: m.status,
      player_a: {
        id: m.playerAId,
        name: playerA?.name || m.playerAId,
        rating: m.ratingABefore || playerA?.rating || 1500,
      },
      player_b: {
        id: m.playerBId,
        name: playerB?.name || m.playerBId,
        rating: m.ratingBBefore || playerB?.rating || 1500,
      },
      winner: winner ? { id: winner.id, name: winner.name } : null,
      total_hands: m.totalHands,
      rating_change_a: m.ratingChangeA,
      rating_change_b: m.ratingChangeB,
      final_stack_a: m.finalStackA,
      final_stack_b: m.finalStackB,
      started_at: m.startedAt,
      ended_at: m.endedAt,
    });
  });

  // GET /api/matches/:id/replay — Redirect to replay route
  app.get('/:id/replay', async (req, reply) => {
    const { id } = req.params as { id: string };

    const replay = ctx.replayLogger.getReplay(id);
    if (!replay) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: '未找到该对局回放数据' });
    }

    return reply.send(replay);
  });
}
