// ============================================================
// AI Action Logger — dual-output: SQLite DB + per-match JSON files
// ============================================================

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface AIActionLogEntry {
  matchId: string;
  botId: string;
  model: string;
  gameType: string;
  round?: number;
  phase?: string;
  systemPrompt: string;
  userPrompt: string;
  rawResponse?: string;
  parsedAction?: unknown;
  usedFallback: boolean;
  latencyMs?: number;
  error?: string;
}

// Log directory for per-match JSON files
const LOG_DIR = join(process.cwd(), 'ai-logs');

export class AIActionLogger {
  private db: any;

  constructor(db?: any) {
    this.db = db;
    // Ensure log directory exists
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  /** Log an AI action to both file and database */
  async log(entry: AIActionLogEntry): Promise<void> {
    const timestamp = new Date().toISOString();
    const logId = uuidv4();

    // 1. File logging — append to per-match JSON Lines file
    try {
      const fileName = `match_${entry.matchId}.jsonl`;
      const filePath = join(LOG_DIR, fileName);
      const logLine = JSON.stringify({
        id: logId,
        timestamp,
        botId: entry.botId,
        model: entry.model,
        gameType: entry.gameType,
        round: entry.round,
        phase: entry.phase,
        systemPrompt: entry.systemPrompt,
        userPrompt: entry.userPrompt,
        rawResponse: entry.rawResponse,
        parsedAction: entry.parsedAction,
        usedFallback: entry.usedFallback,
        latencyMs: entry.latencyMs,
        error: entry.error,
      }) + '\n';
      appendFileSync(filePath, logLine, 'utf-8');
    } catch (err) {
      console.error('[AIActionLogger] File write error:', err);
    }

    // 2. Database logging
    if (this.db) {
      try {
        const { aiActionLogs } = await import('../db/sqlite-schema');
        await this.db.insert(aiActionLogs).values({
          id: logId,
          matchId: entry.matchId,
          botId: entry.botId,
          model: entry.model,
          gameType: entry.gameType,
          round: entry.round ?? null,
          phase: entry.phase ?? null,
          systemPrompt: entry.systemPrompt,
          userPrompt: entry.userPrompt,
          rawResponse: entry.rawResponse ?? null,
          parsedAction: entry.parsedAction ? JSON.stringify(entry.parsedAction) : null,
          usedFallback: entry.usedFallback,
          latencyMs: entry.latencyMs ?? null,
          error: entry.error ?? null,
          createdAt: timestamp,
        });
      } catch (err) {
        console.error('[AIActionLogger] DB insert error:', err);
      }
    }

    // 3. Console log summary
    const actionStr = entry.parsedAction ? JSON.stringify(entry.parsedAction) : 'FALLBACK';
    const fallbackFlag = entry.usedFallback ? ' [FALLBACK]' : '';
    const latency = entry.latencyMs ? ` (${entry.latencyMs}ms)` : '';
    console.log(`[AI Log] ${entry.model} → ${entry.gameType} R${entry.round ?? '?'} ${entry.phase ?? ''}: ${actionStr}${fallbackFlag}${latency}`);
  }

  /** Get all logs for a match (from DB) */
  async getMatchLogs(matchId: string): Promise<unknown[]> {
    if (!this.db) return [];
    try {
      const { aiActionLogs } = await import('../db/sqlite-schema');
      const { eq } = await import('drizzle-orm');
      return await this.db.select().from(aiActionLogs).where(eq(aiActionLogs.matchId, matchId));
    } catch {
      return [];
    }
  }

  /** Get logs by model (from DB) */
  async getModelLogs(model: string, limit = 50): Promise<unknown[]> {
    if (!this.db) return [];
    try {
      const { aiActionLogs } = await import('../db/sqlite-schema');
      const { eq, desc } = await import('drizzle-orm');
      return await this.db.select().from(aiActionLogs)
        .where(eq(aiActionLogs.model, model))
        .orderBy(desc(aiActionLogs.createdAt))
        .limit(limit);
    } catch {
      return [];
    }
  }
}
