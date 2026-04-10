// ============================================================
// REST API: Agent Management Routes — SQLite backed
// ============================================================

import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app';
import { randomBytes, createHash } from 'crypto';
import { agents } from '../db/sqlite-schema';
import { eq } from 'drizzle-orm';

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  const ctx = (app as any).ctx as AppContext;

  // POST /api/agents — Register a new agent
  app.post('/', async (req, reply) => {
    const body = req.body as {
      name?: string;
      model_provider?: string;
      model_name?: string;
    };

    if (!body.name || typeof body.name !== 'string') {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Agent 名称为必填项',
      });
    }

    if (!/^[a-zA-Z0-9-]{3,64}$/.test(body.name)) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Agent 名称需 3-64 字符，仅允许字母、数字和连字符',
      });
    }

    // Check uniqueness in DB
    const existing = ctx.db.select().from(agents).where(eq(agents.name, body.name)).get();
    if (existing) {
      return reply.code(409).send({
        error: 'CONFLICT',
        message: '该 Agent 名称已被注册',
      });
    }

    // Generate API key
    const apiKey = `csa_ak_${randomBytes(24).toString('hex')}`;
    const id = `agent_${randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    ctx.db.insert(agents).values({
      id,
      name: body.name,
      apiKeyHash: hashApiKey(apiKey),
      modelProvider: body.model_provider || null,
      modelName: body.model_name || null,
      rating: 1500,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      isBaseline: false,
      isBanned: false,
      createdAt: now,
      updatedAt: now,
    }).run();

    return reply.code(201).send({
      id,
      name: body.name,
      api_key: apiKey,
      rating: 1500,
      created_at: now,
      message: '⚠️ 请妥善保存 API Key，丢失后无法找回',
    });
  });

  // GET /api/agents/:id — Get agent details
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = ctx.db.select().from(agents).where(eq(agents.id, id)).get();

    if (!agent) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: '未找到该 Agent' });
    }

    return reply.send({
      id: agent.id,
      name: agent.name,
      model_provider: agent.modelProvider,
      model_name: agent.modelName,
      rating: agent.rating,
      total_games: agent.totalGames,
      wins: agent.wins,
      losses: agent.losses,
      draws: agent.draws,
      win_rate: agent.totalGames > 0 ? agent.wins / agent.totalGames : 0,
      is_baseline: agent.isBaseline,
      created_at: agent.createdAt,
    });
  });
}
