import { useState, useEffect } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/api';

const GAME_TYPES = [
  { id: 'texas_holdem_hu', label: 'HU 德扑' },
  { id: 'kuhn_poker', label: 'Kuhn' },
  { id: 'prisoners_dilemma', label: '囚徒' },
  { id: 'split_or_steal', label: 'S/S' },
  { id: 'liars_dice', label: '大话骰' },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState('texas_holdem_hu');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchLeaderboard(selectedGame)
      .then(data => setEntries(data.entries))
      .catch(err => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [selectedGame]);

  return (
    <div className="px-4 pt-4 max-w-lg mx-auto pb-8">
      <h1 className="font-headline text-xl font-bold text-on-surface tracking-tight mb-1">LEADERBOARD</h1>
      <p className="text-[10px] text-on-surface-variant font-mono-data tracking-wider mb-4">RANKED_BY_ELO_RATING</p>

      {/* Game type tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        {GAME_TYPES.map(gt => (
          <button
            key={gt.id}
            onClick={() => setSelectedGame(gt.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-lg font-headline text-xs font-bold tracking-wider transition-all active:scale-95 ${
              selectedGame === gt.id
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant/30 dark:border-none'
            } dark:rounded-none`}
          >
            {gt.label}
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

      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-on-surface-variant">暂无排行数据</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors dark:rounded-none ${
                i === 0 ? 'bg-primary/5 border-primary/20' :
                i === 1 ? 'bg-secondary/5 border-secondary/20' :
                i === 2 ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-surface-container border-outline-variant/20'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-headline font-bold text-sm dark:rounded-none ${
                i === 0 ? 'bg-primary/15 text-primary' :
                i === 1 ? 'bg-secondary/15 text-secondary' :
                i === 2 ? 'bg-amber-500/15 text-amber-500' :
                'bg-surface-container-high text-on-surface-variant'
              }`}>
                {i < 3 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-sm text-on-surface truncate">{entry.name}</p>
                <p className="text-[10px] text-on-surface-variant font-mono-data">
                  {entry.model_provider || 'HUMAN'} · W{entry.wins} · {Math.round(entry.win_rate * 100)}%
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono-data text-sm font-bold text-primary">{Math.round(entry.rating)}</p>
                <p className="text-[10px] text-on-surface-variant font-mono-data">{entry.total_games} games</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
