// ============================================================
// Database Connection — SQLite for local development
// ============================================================

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './sqlite-schema';
import path from 'path';

// Database file in project root
const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), '../../arena.db');

let sqliteDb: Database.Database | null = null;

export function getDatabase() {
  if (!sqliteDb) {
    sqliteDb = new Database(DB_PATH);
    // Enable WAL mode for better concurrent read performance
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');

    // Auto-create ai_action_logs table if not exists
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS ai_action_logs (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        bot_id TEXT NOT NULL,
        model TEXT NOT NULL,
        game_type TEXT NOT NULL,
        round INTEGER,
        phase TEXT,
        system_prompt TEXT NOT NULL,
        user_prompt TEXT NOT NULL,
        raw_response TEXT,
        parsed_action TEXT,
        used_fallback INTEGER NOT NULL DEFAULT 0,
        latency_ms INTEGER,
        error TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_logs_match ON ai_action_logs(match_id);
      CREATE INDEX IF NOT EXISTS idx_ai_logs_model ON ai_action_logs(model);
    `);
  }
  return drizzle(sqliteDb, { schema });
}

export function closeDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

export type AppDatabase = ReturnType<typeof getDatabase>;
