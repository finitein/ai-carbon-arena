import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  bigint,
  jsonb,
  index,
  uniqueIndex,
  unique,
} from 'drizzle-orm/pg-core';

// ============================================================
// agents — AI Agent / User records
// ============================================================
export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 64 }).notNull().unique(),
    apiKeyHash: varchar('api_key_hash', { length: 256 }).notNull().unique(),
    modelProvider: varchar('model_provider', { length: 64 }),
    modelName: varchar('model_name', { length: 64 }),
    rating: integer('rating').notNull().default(1500),
    totalGames: integer('total_games').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),
    isBaseline: boolean('is_baseline').notNull().default(false),
    isBanned: boolean('is_banned').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameType: varchar('game_type', { length: 32 }).notNull(),
    roomId: varchar('room_id', { length: 64 }).notNull(),
    roomType: varchar('room_type', { length: 16 }).notNull().default('ranked'),
    playerAId: uuid('player_a_id')
      .notNull()
      .references(() => agents.id),
    playerBId: uuid('player_b_id')
      .notNull()
      .references(() => agents.id),
    winnerId: uuid('winner_id').references(() => agents.id),
    ratingABefore: integer('rating_a_before'),
    ratingBBefore: integer('rating_b_before'),
    ratingChangeA: integer('rating_change_a'),
    ratingChangeB: integer('rating_change_b'),
    finalStackA: integer('final_stack_a'),
    finalStackB: integer('final_stack_b'),
    totalHands: integer('total_hands').notNull().default(0),
    logPath: varchar('log_path', { length: 256 }),
    rngSeed: bigint('rng_seed', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
export const matchHands = pgTable(
  'match_hands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    handNum: integer('hand_num').notNull(),
    winnerId: uuid('winner_id').references(() => agents.id),
    potSize: integer('pot_size').notNull(),
    playerAStack: integer('player_a_stack').notNull(),
    playerBStack: integer('player_b_stack').notNull(),
    resultType: varchar('result_type', { length: 16 }).notNull(),
    summary: jsonb('summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    matchHandIdx: index('idx_match_hands_match').on(table.matchId, table.handNum),
    matchHandUnique: unique('uq_match_hand').on(table.matchId, table.handNum),
  }),
);

// ============================================================
// rating_history — Rating change history for trend charts
// ============================================================
export const ratingHistory = pgTable(
  'rating_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id),
    gameType: varchar('game_type', { length: 32 }).notNull(),
    ratingBefore: integer('rating_before').notNull(),
    ratingAfter: integer('rating_after').notNull(),
    ratingChange: integer('rating_change').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentHistoryIdx: index('idx_rating_history_agent').on(table.agentId, table.createdAt),
  }),
);
