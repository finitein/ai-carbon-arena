// ============================================================
// SQLite Schema — local development mirror of PostgreSQL schema
// ============================================================

import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

// ============================================================
// users — Human player accounts
// ============================================================
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    rating: integer('rating').notNull().default(1500),
    totalGames: integer('total_games').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),
    isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('idx_users_email').on(table.email),
    ratingIdx: index('idx_users_rating').on(table.rating),
  }),
);

// ============================================================
// agents — AI Agent records
// ============================================================
export const agents = sqliteTable(
  'agents',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    apiKeyHash: text('api_key_hash').notNull().unique(),
    modelProvider: text('model_provider'),
    modelName: text('model_name'),
    rating: integer('rating').notNull().default(1500),
    totalGames: integer('total_games').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),
    isBaseline: integer('is_baseline', { mode: 'boolean' }).notNull().default(false),
    isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    ratingIdx: index('idx_agents_rating').on(table.rating),
    providerIdx: index('idx_agents_provider').on(table.modelProvider),
    baselineIdx: index('idx_agents_is_baseline').on(table.isBaseline),
  }),
);

// ============================================================
// matches — Match records
// ============================================================
export const matches = sqliteTable(
  'matches',
  {
    id: text('id').primaryKey(),
    gameType: text('game_type').notNull(),
    roomId: text('room_id').notNull(),
    roomType: text('room_type').notNull().default('ranked'),
    playerAId: text('player_a_id').notNull().references(() => agents.id),
    playerBId: text('player_b_id').notNull().references(() => agents.id),
    winnerId: text('winner_id').references(() => agents.id),
    ratingABefore: integer('rating_a_before'),
    ratingBBefore: integer('rating_b_before'),
    ratingChangeA: integer('rating_change_a'),
    ratingChangeB: integer('rating_change_b'),
    finalStackA: integer('final_stack_a'),
    finalStackB: integer('final_stack_b'),
    totalHands: integer('total_hands').notNull().default(0),
    logPath: text('log_path'),
    rngSeed: integer('rng_seed').notNull(),
    status: text('status').notNull().default('in_progress'),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    statusIdx: index('idx_matches_status').on(table.status),
    gameTypeIdx: index('idx_matches_game_type').on(table.gameType),
    playerAIdx: index('idx_matches_player_a').on(table.playerAId),
    playerBIdx: index('idx_matches_player_b').on(table.playerBId),
    startedAtIdx: index('idx_matches_started_at').on(table.startedAt),
  }),
);

// ============================================================
// match_hands — Per-hand details within a match
// ============================================================
export const matchHands = sqliteTable(
  'match_hands',
  {
    id: text('id').primaryKey(),
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id),
    handNum: integer('hand_num').notNull(),
    winnerId: text('winner_id').references(() => agents.id),
    potSize: integer('pot_size').notNull(),
    playerAStack: integer('player_a_stack').notNull(),
    playerBStack: integer('player_b_stack').notNull(),
    resultType: text('result_type').notNull(),
    summary: text('summary'), // JSON string
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    matchHandIdx: index('idx_match_hands_match').on(table.matchId, table.handNum),
  }),
);

// ============================================================
// rating_history — Rating change history for trend charts
// ============================================================
export const ratingHistory = sqliteTable(
  'rating_history',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id),
    gameType: text('game_type').notNull(),
    ratingBefore: integer('rating_before').notNull(),
    ratingAfter: integer('rating_after').notNull(),
    ratingChange: integer('rating_change').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    agentHistoryIdx: index('idx_rating_history_agent').on(table.agentId, table.createdAt),
  }),
);

// ============================================================
// ai_action_logs — LLM AI decision records
// ============================================================
export const aiActionLogs = sqliteTable(
  'ai_action_logs',
  {
    id: text('id').primaryKey(),
    matchId: text('match_id').notNull(),
    botId: text('bot_id').notNull(),
    model: text('model').notNull(),
    gameType: text('game_type').notNull(),
    round: integer('round'),
    phase: text('phase'),
    /** Full system prompt sent to LLM */
    systemPrompt: text('system_prompt').notNull(),
    /** Full user prompt (game state + legal actions) */
    userPrompt: text('user_prompt').notNull(),
    /** Raw LLM response text */
    rawResponse: text('raw_response'),
    /** Parsed action JSON */
    parsedAction: text('parsed_action'),
    /** Whether fallback was used */
    usedFallback: integer('used_fallback', { mode: 'boolean' }).notNull().default(false),
    /** API latency in milliseconds */
    latencyMs: integer('latency_ms'),
    /** Error message if any */
    error: text('error'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    matchIdx: index('idx_ai_logs_match').on(table.matchId),
    modelIdx: index('idx_ai_logs_model').on(table.model),
  }),
);
