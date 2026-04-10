// ============================================================
// REST API: Authentication Routes (Human Players)
// ============================================================

import type { FastifyInstance } from 'fastify';
import { AuthService, AuthError } from '../services/auth';
import type { AppContext } from '../app';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const ctx = (app as any).ctx as AppContext;
  const authService = ctx.authService;

  // POST /api/auth/register — Register a new human player
  app.post('/register', async (req, reply) => {
    const body = req.body as {
      email?: string;
      password?: string;
      display_name?: string;
    };

    if (!body.email || !body.password || !body.display_name) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: '邮箱、密码和显示名称为必填项',
      });
    }

    try {
      const result = await authService.register(body.email, body.password, body.display_name);
      return reply.code(201).send({
        token: result.token,
        user: result.user,
        message: '注册成功！欢迎来到碳硅竞技场',
      });
    } catch (err) {
      if (err instanceof AuthError) {
        const statusCode = err.code === 'EMAIL_EXISTS' ? 409 : 400;
        return reply.code(statusCode).send({
          error: err.code,
          message: err.message,
        });
      }
      throw err;
    }
  });

  // POST /api/auth/login — Login with email and password
  app.post('/login', async (req, reply) => {
    const body = req.body as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: '邮箱和密码为必填项',
      });
    }

    try {
      const result = await authService.login(body.email, body.password);
      return reply.send({
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        const statusCode = err.code === 'ACCOUNT_BANNED' ? 403 : 401;
        return reply.code(statusCode).send({
          error: err.code,
          message: err.message,
        });
      }
      throw err;
    }
  });

  // GET /api/auth/me — Get current user profile (JWT required)
  app.get('/me', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: '请先登录',
      });
    }

    const token = authHeader.substring(7);
    const user = authService.verifyToken(token);

    if (!user) {
      return reply.code(401).send({
        error: 'TOKEN_INVALID',
        message: 'Token 无效或已过期',
      });
    }

    return reply.send({ user });
  });
}
