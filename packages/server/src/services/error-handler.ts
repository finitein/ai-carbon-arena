// ============================================================
// Error Handler — unified error response format for Fastify
// ============================================================

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Register a unified error handler on the Fastify instance.
 * All unhandled errors will be formatted consistently.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode || 500;

    // Log server errors
    if (statusCode >= 500) {
      request.log.error(error, 'Internal server error');
    } else {
      request.log.warn({ err: error.message, statusCode }, 'Client error');
    }

    const response: ApiError = {
      error: error.code || 'INTERNAL_ERROR',
      message: statusCode >= 500
        ? '服务器内部错误，请稍后重试'
        : error.message || '请求处理失败',
      statusCode,
    };

    reply.code(statusCode).send(response);
  });

  // Handle 404
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send({
      error: 'NOT_FOUND',
      message: `路由 ${request.method} ${request.url} 不存在`,
      statusCode: 404,
    });
  });
}
