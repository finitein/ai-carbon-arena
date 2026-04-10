// ============================================================
// REST API: Replay Routes
// ============================================================

import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app';

export async function replayRoutes(app: FastifyInstance): Promise<void> {
  const ctx = (app as any).ctx as AppContext;

  // GET /api/replay/:matchId — Get replay data for a match
  app.get('/:matchId', async (req, reply) => {
    const { matchId } = req.params as { matchId: string };

    const replay = ctx.replayLogger.getReplay(matchId);

    if (!replay) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: '未找到该对局的回放数据',
      });
    }

    return reply.send(replay);
  });

  // GET /api/replay — List available replays
  app.get('/', async (req, reply) => {
    const replayIds = ctx.replayLogger.getReplayIds();
    const replays = replayIds.map(id => {
      const r = ctx.replayLogger.getReplay(id)!;
      return {
        matchId: r.matchId,
        gameType: r.gameType,
        players: r.players,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        eventCount: r.events.length,
      };
    });

    return reply.send({
      total: replays.length,
      replays,
    });
  });
}
