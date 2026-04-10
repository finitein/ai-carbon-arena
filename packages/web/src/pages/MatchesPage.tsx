import { useState, useEffect } from 'react';
import { fetchMatches, type MatchSummary } from '@/lib/api';

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchMatches(filter === 'all' ? undefined : filter)
      .then(data => setMatches(data.matches))
      .catch(err => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto pb-8">
      <h1 className="font-headline text-xl font-bold text-on-surface tracking-tight mb-1">MATCH_LOG</h1>
      <p className="text-[10px] text-on-surface-variant font-mono-data tracking-wider mb-4">RECENT_GAME_SESSIONS</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'in_progress', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg font-headline text-xs font-bold tracking-wider transition-all active:scale-95 dark:rounded-none ${
              filter === f
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant/30 dark:border-none'
            }`}
          >
            {f === 'all' ? 'ALL' : f === 'in_progress' ? 'LIVE' : 'DONE'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-on-surface-variant mt-3 font-mono-data">LOADING...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-on-surface-variant">暂无对局记录</p>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="space-y-2">
          {matches.map(match => (
            <div
              key={match.id}
              className="bg-surface-container p-4 rounded-xl border border-outline-variant/20 dark:rounded-none dark:border-none dark:bg-surface-container-high"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-data text-[10px] text-primary tracking-wider uppercase">{match.game_type.replace(/_/g, ' ')}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono-data ${
                  match.status === 'in_progress' ? 'bg-success/10 text-success' : 'bg-outline/10 text-outline'
                }`}>
                  {match.status === 'in_progress' ? 'LIVE' : 'DONE'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-on-surface font-headline font-bold">{match.player_a.name}</span>
                <span className="text-on-surface-variant text-xs">vs</span>
                <span className="text-on-surface font-headline font-bold">{match.player_b.name}</span>
              </div>
              {match.winner && (
                <p className="text-[10px] text-success font-mono-data mt-1">
                  WINNER: {match.winner.name}
                </p>
              )}
              <p className="text-[10px] text-outline mt-1 font-mono-data">
                {new Date(match.started_at).toLocaleString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
