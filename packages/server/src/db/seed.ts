#!/usr/bin/env tsx
// ============================================================
// Database Seed Script — create tables + insert test data
// ============================================================

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createHash, randomBytes } from 'crypto';
import path from 'path';
import * as schema from './sqlite-schema';

const DB_PATH = process.env.DATABASE_PATH || path.resolve(__dirname, '../../../../arena.db');

console.log(`📦 Database path: ${DB_PATH}`);

// Create database
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// const db = drizzle(sqlite, { schema });

// ============================================================
// Create Tables
// ============================================================
console.log('🔨 Creating tables...');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 1500,
    total_games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    is_banned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating);

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_key_hash TEXT NOT NULL UNIQUE,
    model_provider TEXT,
    model_name TEXT,
    rating INTEGER NOT NULL DEFAULT 1500,
    total_games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    is_baseline INTEGER NOT NULL DEFAULT 0,
    is_banned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_agents_rating ON agents(rating);
  CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(model_provider);
  CREATE INDEX IF NOT EXISTS idx_agents_is_baseline ON agents(is_baseline);

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    room_id TEXT NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'ranked',
    player_a_id TEXT NOT NULL REFERENCES agents(id),
    player_b_id TEXT NOT NULL REFERENCES agents(id),
    winner_id TEXT REFERENCES agents(id),
    rating_a_before INTEGER,
    rating_b_before INTEGER,
    rating_change_a INTEGER,
    rating_change_b INTEGER,
    final_stack_a INTEGER,
    final_stack_b INTEGER,
    total_hands INTEGER NOT NULL DEFAULT 0,
    log_path TEXT,
    rng_seed INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at TEXT NOT NULL,
    ended_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
  CREATE INDEX IF NOT EXISTS idx_matches_game_type ON matches(game_type);
  CREATE INDEX IF NOT EXISTS idx_matches_player_a ON matches(player_a_id);
  CREATE INDEX IF NOT EXISTS idx_matches_player_b ON matches(player_b_id);
  CREATE INDEX IF NOT EXISTS idx_matches_started_at ON matches(started_at);

  CREATE TABLE IF NOT EXISTS match_hands (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id),
    hand_num INTEGER NOT NULL,
    winner_id TEXT REFERENCES agents(id),
    pot_size INTEGER NOT NULL,
    player_a_stack INTEGER NOT NULL,
    player_b_stack INTEGER NOT NULL,
    result_type TEXT NOT NULL,
    summary TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_match_hands_match ON match_hands(match_id, hand_num);

  CREATE TABLE IF NOT EXISTS rating_history (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    match_id TEXT NOT NULL REFERENCES matches(id),
    game_type TEXT NOT NULL,
    rating_before INTEGER NOT NULL,
    rating_after INTEGER NOT NULL,
    rating_change INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rating_history_agent ON rating_history(agent_id, created_at);
`);

console.log('✅ Tables created');

// ============================================================
// Hash password helper
// ============================================================
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + s).digest('hex');
  return { hash: `${s}:${hash}`, salt: s };
}

function generateUUID(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

// ============================================================
// Seed 5 Test Human Accounts
// ============================================================
console.log('👤 Creating 5 test human accounts...');

const testAccounts = [
  { email: 'test1@arena.cc', displayName: 'Player-Alpha' },
  { email: 'test2@arena.cc', displayName: 'Player-Beta' },
  { email: 'test3@arena.cc', displayName: 'Player-Gamma' },
  { email: 'test4@arena.cc', displayName: 'Player-Delta' },
  { email: 'test5@arena.cc', displayName: 'Player-Epsilon' },
];

const DEFAULT_PASSWORD = 'Test@12345';
const now = new Date().toISOString();

const insertUser = sqlite.prepare(`
  INSERT OR IGNORE INTO users (id, email, password_hash, display_name, rating, total_games, wins, losses, draws, is_banned, created_at, updated_at)
  VALUES (?, ?, ?, ?, 1500, 0, 0, 0, 0, 0, ?, ?)
`);

for (const account of testAccounts) {
  const id = generateUUID();
  const { hash } = hashPassword(DEFAULT_PASSWORD);
  insertUser.run(id, account.email, hash, account.displayName, now, now);
}

console.log('✅ Test accounts created:');
console.log('');
console.log('  ┌──────────────────────┬──────────────────┬──────────────┐');
console.log('  │ Email                │ Display Name     │ Password     │');
console.log('  ├──────────────────────┼──────────────────┼──────────────┤');
for (const account of testAccounts) {
  console.log(`  │ ${account.email.padEnd(20)} │ ${account.displayName.padEnd(16)} │ ${DEFAULT_PASSWORD} │`);
}
console.log('  └──────────────────────┴──────────────────┴──────────────┘');

// ============================================================
// Seed Baseline Agents
// ============================================================
console.log('');
console.log('🤖 Creating baseline agents...');

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

const baselineAgents = [
  { name: 'random-baseline', modelName: 'Random Bot', rating: 1200 },
  { name: 'rule-baseline', modelName: 'Rule Bot', rating: 1520 },
  { name: 'cfr-baseline', modelName: 'CFR Bot', rating: 1650 },
];

const insertAgent = sqlite.prepare(`
  INSERT OR IGNORE INTO agents (id, name, api_key_hash, model_provider, model_name, rating, total_games, wins, losses, draws, is_baseline, is_banned, created_at, updated_at)
  VALUES (?, ?, ?, NULL, ?, ?, 0, 0, 0, 0, 1, 0, ?, ?)
`);

for (const agent of baselineAgents) {
  const id = generateUUID();
  const apiKey = `csa_ak_baseline_${agent.name}`;
  insertAgent.run(id, agent.name, hashApiKey(apiKey), agent.modelName, agent.rating, now, now);
  console.log(`  ✅ ${agent.name} (${agent.modelName}) — Rating: ${agent.rating}`);
}

// ============================================================
// Verify
// ============================================================
console.log('');
const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
const agentCount = sqlite.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
console.log(`📊 Database summary: ${userCount.count} users, ${agentCount.count} agents`);
console.log('');
console.log('🎉 Seed complete! Database ready at:', DB_PATH);

sqlite.close();
