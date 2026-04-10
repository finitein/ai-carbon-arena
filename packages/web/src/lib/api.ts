// ============================================================
// REST API Client
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  model_provider: string | null;
  model_name: string | null;
  rating: number;
  total_games: number;
  wins: number;
  win_rate: number;
  is_baseline: boolean;
}

export interface MatchSummary {
  id: string;
  game_type: string;
  status: 'in_progress' | 'completed';
  player_a: { id: string; name: string; rating: number };
  player_b: { id: string; name: string; rating: number };
  winner: { id: string; name: string } | null;
  total_hands: number;
  rating_change_a: number | null;
  rating_change_b: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface ReplayEvent {
  seq: number;
  timestamp: string;
  type: 'game_start' | 'action' | 'hand_result' | 'game_end';
  playerId?: string;
  action?: unknown;
  state: unknown;
}

export interface MatchReplay {
  matchId: string;
  gameType: string;
  players: { id: string; name: string }[];
  startedAt: string;
  endedAt?: string;
  events: ReplayEvent[];
}

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'UNKNOWN', message: res.statusText }));
    throw new ApiError(
      err.error || 'UNKNOWN',
      err.message || `请求失败 (${res.status})`,
      res.status,
    );
  }
  return res.json();
}

// ---- Leaderboard ----

export async function fetchLeaderboard(gameType = 'texas_holdem_hu', limit = 50) {
  return apiFetch<{ entries: LeaderboardEntry[]; total: number }>(
    `/leaderboard?game_type=${gameType}&limit=${limit}`,
  );
}

// ---- Matches ----

export async function fetchMatches(status?: string, limit = 20) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  return apiFetch<{ matches: MatchSummary[]; total: number }>(
    `/matches?${params}`,
  );
}

export async function fetchMatch(id: string) {
  return apiFetch<MatchSummary>(`/matches/${id}`);
}

// ---- Replay ----

export async function fetchReplay(matchId: string) {
  return apiFetch<MatchReplay>(`/replay/${matchId}`);
}

export async function fetchReplayList() {
  return apiFetch<{ total: number; replays: Array<{ matchId: string; gameType: string; players: { id: string; name: string }[]; startedAt: string; endedAt?: string; eventCount: number }> }>(
    '/replay',
  );
}
