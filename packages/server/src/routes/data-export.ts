// ============================================================
// REST API: Data Export Routes (V2-D2)
// ============================================================

import type { FastifyInstance } from 'fastify';

export async function dataExportRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/data/matches — Export match data for researchers
  app.get('/matches', async (req, reply) => {
    const query = req.query as {
      format?: string;
      game_type?: string;
      from?: string;
      to?: string;
      limit?: string;
    };

    const format = query.format || 'json';
    const limit = Math.min(parseInt(query.limit || '100', 10), 1000);

    // TODO: Query from real database
    const data = {
      exported_at: new Date().toISOString(),
      format,
      game_type: query.game_type || 'all',
      total: 0,
      limit,
      matches: [],
      metadata: {
        schema_version: '1.0',
        platform: 'Carbon-Silicon Arena',
        description: '碳硅竞技场对局数据导出',
      },
    };

    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename=matches.csv');
      return reply.send('id,game_type,player_a,player_b,winner,total_hands,started_at\n');
    }

    return reply.send(data);
  });

  // GET /api/data/stats — Platform statistics
  app.get('/stats', async (_req, reply) => {
    return reply.send({
      total_agents: 0,
      total_matches: 0,
      active_matches: 0,
      highest_rating: 0,
      supported_games: ['texas_holdem_hu', 'prisoners_dilemma', 'split_or_steal'],
      platform_version: '0.2.0',
    });
  });
}
