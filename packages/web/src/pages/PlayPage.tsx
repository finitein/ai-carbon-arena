import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GAMES, formatActionLabel, type GameDef, type MatchMode, type PageView } from './play/game-defs';
import { renderGameState } from './play/GameStateRenderer';
import { GameActionPanel } from './play/GameActionPanel';

// ============================================================
// Sub-Components
// ============================================================
function GameCard({ game, selected, onClick }: { game: GameDef; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-[20px] transition-all duration-300 active:scale-[0.97] glass-panel ${
        selected
          ? 'border-primary/50 shadow-[0_8px_24px_rgba(0,113,227,0.15)] bg-primary/5'
          : 'border-outline-variant/30 hover:border-outline/50 hover:shadow-md hover:bg-surface-container/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{game.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-headline font-bold text-on-surface truncate">{game.name}</h3>
          <p className="text-[10px] text-on-surface-variant mt-0.5 font-mono-data">{game.nameEn}</p>
          <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">{game.desc}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant font-mono-data tracking-tight">{game.players}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant font-mono-data tracking-tight">{game.duration}</span>
            {game.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono-data tracking-tight border border-primary/10">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function MatchModeSelector({ mode, onChange }: { mode: MatchMode; onChange: (m: MatchMode) => void }) {
  const modes = [
    { id: 'vs_ai' as const, label: '🤖 人机对战', desc: '与 AI Bot 对战' },
    { id: 'vs_human' as const, label: '👤 人人对战', desc: '匹配真人玩家' },
    { id: 'mixed' as const, label: '🔀 混合匹配', desc: '随机匹配人/AI' },
  ];
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex-1 p-4 rounded-[20px] text-left transition-all duration-300 active:scale-[0.97] glass-panel ${
            mode === m.id
              ? 'border-primary/50 shadow-[0_8px_24px_rgba(0,113,227,0.15)] bg-primary/5'
              : 'border-outline-variant/30 hover:border-outline/50 hover:shadow-md hover:bg-surface-container/80'
          }`}
        >
          <p className="text-sm font-headline font-bold text-on-surface">{m.label}</p>
          <p className="text-[10px] text-on-surface-variant font-mono-data tracking-tight mt-1">{m.desc}</p>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// WS URL helper
// ============================================================
function getWsBase(): string {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return explicit;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

// ============================================================
// Main Play Page
// ============================================================
export default function PlayPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('game');

  const [selectedGame, setSelectedGame] = useState<string | null>(preselected);
  const [matchMode, setMatchMode] = useState<MatchMode>('vs_ai');
  const [view, setView] = useState<PageView>('lobby');
  const [matchingSeconds, setMatchingSeconds] = useState(0);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('对手');
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const [legalActions, setLegalActions] = useState<unknown[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const matchingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleServerMessageRef = useRef<(msg: { type: string; payload: Record<string, unknown> }) => void>(() => {});
  const autoStarted = useRef(false);

  const game = GAMES.find(g => g.id === selectedGame);

  const log = useCallback((msg: string) => {
    setActionLog(prev => [...prev.slice(-50), msg]);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (matchingTimerRef.current) clearInterval(matchingTimerRef.current);
    };
  }, []);

  // Auto-start matching if navigated from homepage with autostart=true
  const autostart = searchParams.get('autostart') === 'true';
  useEffect(() => {
    if (autostart && preselected && user && !autoStarted.current && view === 'lobby') {
      autoStarted.current = true;
      // Small delay to let state settle
      const t = setTimeout(() => {
        setSelectedGame(preselected);
        startMatchingImmediate(preselected);
      }, 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart, preselected, user]);

  const doStartMatching = useCallback((gameId: string) => {
    if (!user) return;
    setView('matching');
    setMatchingSeconds(0);
    setActionLog([]);

    matchingTimerRef.current = setInterval(() => {
      setMatchingSeconds(prev => prev + 1);
    }, 1000);

    const ws = new WebSocket(`${getWsBase()}/ws/agent`);
    wsRef.current = ws;

    ws.onopen = () => {
      log('[系统] 已连接到服务器');
      ws.send(JSON.stringify({
        type: 'client_hello', seq: 1, timestamp: new Date().toISOString(),
        payload: { api_key: `human_${user.id}`, protocol_version: '1.0', agent_name: user.displayName },
      }));
    };
    ws.onmessage = (event) => {
      try { handleServerMessageRef.current(JSON.parse(event.data as string)); } catch { /* */ }
    };
    ws.onclose = () => {
      log('[系统] 连接已断开');
      if (matchingTimerRef.current) { clearInterval(matchingTimerRef.current); matchingTimerRef.current = null; }
    };
    ws.onerror = () => log('[系统] 连接出错');
  }, [user, log]);

  const startMatching = useCallback(() => {
    if (!selectedGame) return;
    doStartMatching(selectedGame);
  }, [selectedGame, doStartMatching]);

  const startMatchingImmediate = useCallback((gameId: string) => {
    doStartMatching(gameId);
  }, [doStartMatching]);

  const handleServerMessage = useCallback((msg: { type: string; payload: Record<string, unknown> }) => {
    switch (msg.type) {
      case 'server_hello': {
        log('[系统] 认证成功，正在匹配...');
        wsRef.current?.send(JSON.stringify({
          type: 'join_queue', seq: 2, timestamp: new Date().toISOString(),
          payload: { game_type: selectedGame || 'texas_holdem_hu', match_mode: matchMode },
        }));
        break;
      }
      case 'queue_status': log(`[系统] 排队: ${msg.payload.status}`); break;
      case 'match_found': {
        if (matchingTimerRef.current) { clearInterval(matchingTimerRef.current); matchingTimerRef.current = null; }
        setRoomId(msg.payload.room_id as string);
        setOpponentName(msg.payload.opponent as string || '对手');
        setGameState(msg.payload.state as Record<string, unknown>);
        setView('playing');
        log(`[系统] ✅ 匹配成功！对手: ${msg.payload.opponent}`);
        break;
      }
      case 'action_request': {
        const turn = msg.payload.your_turn as boolean;
        setGameState(msg.payload.state as Record<string, unknown>);
        setLegalActions((msg.payload.legal_actions as unknown[]) || []);
        setIsMyTurn(turn);
        setRoomId(msg.payload.room_id as string);
        log(turn ? '[系统] ⚡ 轮到你行动' : '[系统] ⏳ 等待对手...');
        break;
      }
      case 'action_result': log(`[系统] ${msg.payload.accepted ? '✅ 接受' : '❌ 拒绝'}`); break;
      case 'game_end': {
        setGameState(msg.payload.state as Record<string, unknown>);
        setView('finished');
        setIsMyTurn(false);
        setLegalActions([]);
        log('[系统] 🏁 对局结束');
        break;
      }
      case 'error': log(`[错误] ${msg.payload.message}`); break;
    }
  }, [selectedGame, matchMode, log]);

  useEffect(() => { handleServerMessageRef.current = handleServerMessage; }, [handleServerMessage]);

  const sendAction = useCallback((action: Record<string, unknown>) => {
    if (!wsRef.current || !roomId) return;
    wsRef.current.send(JSON.stringify({
      type: 'game_action', seq: Date.now(), timestamp: new Date().toISOString(),
      payload: { room_id: roomId, action_data: action },
    }));
    log(`[你] ${formatActionLabel(action)}`);
    setIsMyTurn(false);
  }, [roomId, log]);

  const cancelMatching = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    if (matchingTimerRef.current) { clearInterval(matchingTimerRef.current); matchingTimerRef.current = null; }
    setView('lobby'); setMatchingSeconds(0);
  }, []);

  const exitGame = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null;
    setView('lobby'); setActionLog([]); setGameState(null); setLegalActions([]); setIsMyTurn(false); setRoomId(null);
  }, []);

  // ===== Login Required =====
  if (!user) {
    return (
      <div className="px-4 pt-20 text-center max-w-sm mx-auto">
        <div className="text-5xl mb-6">🔒</div>
        <h2 className="font-headline text-xl font-bold text-on-surface mb-2">ACCESS_DENIED</h2>
        <p className="text-on-surface-variant text-sm mb-4">需要登录后才能进入对战大厅</p>
        <Link to="/login" className="inline-block px-8 py-2.5 bg-primary text-on-primary rounded-lg font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform dark:rounded-none">LOGIN</Link>
      </div>
    );
  }

  // ===== Lobby =====
  if (view === 'lobby') {
    return (
      <div className="px-4 pt-4 max-w-2xl mx-auto pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-headline text-xl font-bold text-on-surface tracking-tight">GAME_LOBBY</h1>
            <p className="text-[10px] text-on-surface-variant font-mono-data tracking-wider mt-0.5">SELECT_PROTOCOL · MATCH · ENGAGE</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-on-surface-variant font-mono-data">{user.displayName}</span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-[10px] font-headline font-bold text-on-surface-variant mb-3 tracking-widest uppercase">MATCH_MODE</h2>
          <MatchModeSelector mode={matchMode} onChange={setMatchMode} />
        </div>

        <div className="mb-6">
          <h2 className="text-[10px] font-headline font-bold text-on-surface-variant mb-3 tracking-widest uppercase">SELECT_GAME</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GAMES.map(g => (
              <GameCard key={g.id} game={g} selected={selectedGame === g.id} onClick={() => setSelectedGame(g.id)} />
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={startMatching}
            disabled={!selectedGame}
            className={`px-12 py-3.5 rounded-[16px] font-headline font-bold text-sm tracking-widest transition-all duration-300 active:scale-95 ${
              selectedGame
                ? 'bg-primary text-white shadow-[0_8px_24px_rgba(0,113,227,0.3)] hover:shadow-[0_12px_32px_rgba(0,113,227,0.4)]'
                : 'bg-surface-container-highest text-outline/50 cursor-not-allowed'
            }`}
          >
            {selectedGame ? `START ${game?.nameEn?.toUpperCase() || ''}` : 'SELECT A GAME'}
          </button>
        </div>
      </div>
    );
  }

  // ===== Matching =====
  if (view === 'matching') {
    return (
      <div className="px-4 pt-20 text-center max-w-md mx-auto">
        <div className="text-6xl mb-6 animate-bounce">{game?.emoji}</div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">{game?.name}</h2>
        <p className="text-on-surface-variant text-sm mb-4 font-mono-data">SEARCHING_FOR_OPPONENT...</p>
        <div className="text-3xl font-bold text-primary mb-6 tabular-nums font-mono-data">
          {Math.floor(matchingSeconds / 60).toString().padStart(2, '0')}:{(matchingSeconds % 60).toString().padStart(2, '0')}
        </div>
        <div className="w-full glass-panel-high rounded-full h-1.5 mb-6 max-w-xs mx-auto overflow-hidden">
          <div className="bg-primary h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_8px_var(--color-primary)]" style={{ width: `${Math.min((matchingSeconds / 60) * 100, 100)}%` }} />
        </div>
        {actionLog.length > 0 && (
          <div className="text-left mx-auto max-w-xs mb-6 space-y-1">
            {actionLog.map((l, i) => <p key={i} className="text-[10px] text-on-surface-variant font-mono-data">{l}</p>)}
          </div>
        )}
        <button onClick={cancelMatching} className="text-sm text-primary hover:underline font-headline tracking-wider">CANCEL</button>
      </div>
    );
  }

  // ===== Result Banner =====
  const renderResultBanner = () => {
    if (view !== 'finished' || !gameState) return null;
    const gs = gameState as Record<string, any>;
    let resultText = '🏁 GAME OVER';
    let resultColor = 'from-outline to-outline-variant';
    if (gs.yourScore !== undefined && gs.opponentScore !== undefined) {
      if (gs.yourScore > gs.opponentScore) { resultText = '🏆 VICTORY'; resultColor = 'from-amber-500 to-amber-600'; }
      else if (gs.yourScore < gs.opponentScore) { resultText = '😢 DEFEAT'; resultColor = 'from-outline to-outline-variant'; }
      else { resultText = '🤝 DRAW'; resultColor = 'from-primary to-secondary'; }
    }
    if (gs.yourPayout !== undefined) {
      if (gs.yourPayout > 0) { resultText = `🏆 +¥${gs.yourPayout}`; resultColor = 'from-amber-500 to-amber-600'; }
      else { resultText = '😢 ¥0'; resultColor = 'from-outline to-outline-variant'; }
    }
    return (
      <div className={`bg-gradient-to-r ${resultColor} rounded-xl p-6 text-center mb-6 dark:rounded-none`}>
        <p className="text-white text-2xl font-headline font-bold">{resultText}</p>
      </div>
    );
  };

  // ===== Playing / Finished =====
  return (
    <div className="px-4 pt-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{game?.emoji}</span>
          <div>
            <h1 className="font-headline text-lg font-bold text-on-surface">{game?.name}</h1>
            <p className="text-[10px] text-on-surface-variant font-mono-data">vs {opponentName}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono-data dark:rounded-none ${
          view === 'finished' ? 'bg-outline/10 text-outline' :
          isMyTurn ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
        }`}>
          {view === 'finished' ? 'ENDED' : isMyTurn ? '⚡ YOUR_TURN' : '⏳ WAITING'}
        </span>
      </div>

      {renderResultBanner()}

      {/* Game Area */}
      <div className="rounded-[24px] overflow-hidden mb-6 shadow-xl border border-white/5 bg-black/40">
        <div className={`bg-gradient-to-br ${game?.color || 'from-surface-container-highest/20 to-surface-container/10'} p-6 min-h-[300px] flex flex-col justify-between`}>
          <div className="text-center mb-4">
            <div className="w-10 h-10 mx-auto mb-1.5 rounded-[12px] bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-sm text-lg">🤖</div>
            <p className="font-mono-data text-[10px] font-bold tracking-widest text-white/50">{opponentName}</p>
          </div>
          <div className="py-2 flex-1 flex flex-col justify-center">{renderGameState(gameState as Record<string, any>, selectedGame)}</div>
          <div className="text-center mt-4">
            <div className="w-10 h-10 mx-auto mb-1.5 rounded-[12px] bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-sm font-bold text-sm">你</div>
            <p className="font-mono-data text-[10px] font-bold tracking-widest text-white/50">{user.displayName}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isMyTurn && legalActions.length > 0 && (
        <div className="glass-panel-high p-5 rounded-[24px] mb-6">
          <p className="text-[10px] font-headline font-bold text-primary mb-4 tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            AWAITING_INPUT
          </p>
          <GameActionPanel 
            selectedGame={selectedGame!} 
            gameState={gameState as Record<string, any>} 
            legalActions={legalActions as Record<string, any>[]} 
            sendAction={sendAction} 
          />
        </div>
      )}

      {/* Log */}
      <div className="glass-panel p-5 rounded-[24px] mb-8">
        <h3 className="text-[10px] font-headline font-bold text-on-surface-variant mb-3 tracking-widest uppercase">BATTLE_LOG</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
          {actionLog.map((l, i) => (
            <p key={i} className={`text-xs font-mono-data ${l.startsWith('[你]')?'text-primary':l.startsWith('[系统]')?'text-secondary':l.startsWith('[错误]')?'text-error':'text-on-surface-variant'}`}>{l}</p>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button onClick={exitGame} className="text-sm text-error hover:underline font-headline tracking-wider">
          {view === 'finished' ? 'BACK TO LOBBY' : 'EXIT GAME'}
        </button>
      </div>
    </div>
  );
}
