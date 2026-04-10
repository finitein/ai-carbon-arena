// ============================================================
// Game State Renderers — one per game type
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function InfoPill({ label, value, icon }: { label: string; value: string | number; icon?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-white/10 backdrop-blur-md border border-white/10 shadow-sm">
      {icon && <span className="text-sm">{icon}</span>}
      <span className="text-[10px] text-white/70 font-headline tracking-wider">{label}</span>
      <span className="text-xs font-mono-data font-bold text-white">{String(value)}</span>
    </div>
  );
}

const phaseLabels: Record<string, string> = {
  preflop: '翻前', flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌',
  choose: '选择', reveal: '揭示', end: '结束',
  negotiate: '谈判', decide: '决策',
  propose: '提议', respond: '回应', round_end: '本轮结束', game_over: '游戏结束',
  bidding: '出价', challenge_resolution: '质疑结算', new_round: '新一轮',
  player1_action: '玩家1行动', player2_action: '玩家2行动', hand_over: '牌局结束',
  discussion: '讨论', resolution: '结算', clue_distribution: '线索分发',
  action: '行动', challenge: '质疑判定', counteraction: '反制',
  pre_discuss: '讨论', commit: '出牌', declare: '宣言', accuse: '指控',
};

export function renderGameState(gameState: Record<string, any> | null, selectedGame: string | null): JSX.Element {
  if (!gameState) return <p className="text-white text-sm">加载中...</p>;
  const gs = gameState;
  const gt = gs.gameType || selectedGame || '';
  const phase = phaseLabels[gs.phase] || gs.phase || '';

  switch (gt) {
    case 'texas_holdem_hu': {
      const cards = (gs.yourCards || []) as { rank: string; suit: string }[];
      const comm = (gs.communityCards || []) as { rank: string; suit: string }[];
      const suitEmoji: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
      const renderCard = (c: { rank: string; suit: string }) => {
        const isRed = c.suit === 'hearts' || c.suit === 'diamonds';
        return (
          <span key={`${c.rank}${c.suit}`} className={`inline-flex items-center px-2 py-1 rounded-[8px] font-mono-data font-bold text-sm shadow-sm ${isRed ? 'bg-white text-red-600' : 'bg-white text-gray-800'}`}>
            {c.rank}{suitEmoji[c.suit] || c.suit}
          </span>
        );
      };
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="手牌" value={`#${gs.handNum || 1}`} icon="🃏" />
            <InfoPill label="阶段" value={phase} />
            <InfoPill label="底池" value={`${gs.pot || 0}`} icon="💰" />
            <InfoPill label="你的筹码" value={`${gs.yourStack || 0}`} />
            <InfoPill label="对手筹码" value={`${gs.opponentStack || 0}`} />
          </div>
          {comm.length > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-white/50 mb-1">公共牌</p>
              <div className="flex justify-center gap-1">{comm.map(renderCard)}</div>
            </div>
          )}
          {cards.length > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-white/50 mb-1">你的底牌</p>
              <div className="flex justify-center gap-1">{cards.map(renderCard)}</div>
            </div>
          )}
          {gs.handResult && (
            <div className="text-center p-3 rounded-[16px] bg-white/10 backdrop-blur-md border border-white/10 shadow-sm mt-4">
              <p className="text-white text-sm font-headline font-bold tracking-widest">
                {gs.handResult.winnerId === null ? '🤝 DRAW' : gs.handResult.resultType === 'fold' ? 'OPPONENT FOLDED' : 'SHOWDOWN'}
              </p>
            </div>
          )}
        </div>
      );
    }
    case 'prisoners_dilemma': {
      const history = (gs.history || []) as { round: number; moves: string[]; scores: number[] }[];
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="回合" value={`${gs.round || 1}/${gs.totalRounds || 10}`} icon="🔄" />
            <InfoPill label="你的得分" value={gs.yourScore ?? 0} icon="⭐" />
            <InfoPill label="对手得分" value={gs.opponentScore ?? 0} icon="🤖" />
          </div>
          {history.length > 0 && (
            <div className="max-h-32 overflow-y-auto">
              <table className="w-full text-xs text-white/80">
                <thead><tr className="text-white/50"><th className="py-1">回合</th><th>你</th><th>对手</th><th>得分</th></tr></thead>
                <tbody>
                  {history.slice(-5).map(h => (
                    <tr key={h.round} className="text-center border-t border-white/10">
                      <td className="py-0.5">{h.round}</td>
                      <td>{h.moves[0] === 'cooperate' ? '🤝' : '🗡'}</td>
                      <td>{h.moves[1] === 'cooperate' ? '🤝' : '🗡'}</td>
                      <td>{h.scores[0]} / {h.scores[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }
    case 'split_or_steal': {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="奖池" value={`¥${gs.jackpot || 0}`} icon="💰" />
            <InfoPill label="阶段" value={phase} />
          </div>
          <div className="rounded-[16px] bg-black/20 backdrop-blur-md border border-white/5 p-4 shadow-inner">
            <p className="text-[10px] font-headline font-bold tracking-widest text-primary mb-3">💬 NEGOTIATION_LOG</p>
            <div className="max-h-40 min-h-[60px] overflow-y-auto space-y-2 text-left pr-2">
              {(gs.messages || []).length > 0 ? (
                (gs.messages as { playerId: string; text: string }[]).map((m: any, i: number) => (
                  <p key={i} className="text-xs text-white/90 bg-white/5 p-2 rounded-[10px] border border-white/5">
                    <span className="font-mono-data font-bold text-primary mr-1">{m.playerId?.slice(0, 8)}:</span> {m.text}
                  </p>
                ))
              ) : (
                <p className="text-xs text-white/30 text-center py-2">暂无消息…</p>
              )}
            </div>
          </div>
          {gs.result && (
            <div className="text-center p-4 rounded-[16px] bg-white/10 backdrop-blur-md border border-white/10 shadow-sm mt-4">
              <p className="text-white text-lg font-headline font-bold tracking-widest">
                {gs.result.outcome === 'both_split' ? '🤝 SPLIT' : gs.result.outcome === 'both_steal' ? '💀 MUTUAL DESTRUCTION' : '💰 STOLEN'}
              </p>
              <p className="text-primary font-mono-data font-bold text-sm mt-2">YOUR PAYOUT: ¥{gs.yourPayout ?? 0}</p>
            </div>
          )}
        </div>
      );
    }
    case 'kuhn_poker': {
      const cardEmoji: Record<string, string> = { J: '🂫', Q: '🂭', K: '🂮' };
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="手牌" value={`#${gs.handNum}/${gs.totalHands}`} icon="🂡" />
            <InfoPill label="底池" value={gs.pot || 0} icon="💰" />
            <InfoPill label="你的分" value={gs.yourScore ?? 0} icon="⭐" />
            <InfoPill label="对手分" value={gs.opponentScore ?? 0} icon="🤖" />
          </div>
          {gs.yourCard && (
            <div className="text-center">
              <p className="text-[10px] text-white/50 mb-1">你的牌</p>
              <span className="text-4xl">{cardEmoji[gs.yourCard] || gs.yourCard}</span>
              <p className="text-white font-bold text-lg mt-1">{gs.yourCard}</p>
            </div>
          )}
        </div>
      );
    }
    case 'ultimatum': {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="回合" value={`${gs.round}/2`} icon="⚖️" />
            <InfoPill label="角色" value={gs.role === 'proposer' ? '提议者' : '回应者'} />
            <InfoPill label="总额" value={`¥${gs.totalAmount || 100}`} icon="💰" />
            <InfoPill label="你的分" value={`¥${gs.yourScore ?? 0}`} icon="⭐" />
          </div>
          {gs.proposal && (
            <div className="text-center p-3 rounded-xl bg-white/15">
              <p className="text-white text-sm">
                提议: 提议者拿 <span className="font-bold">¥{gs.proposal.proposerShare}</span>，回应者拿 <span className="font-bold">¥{gs.proposal.responderShare}</span>
              </p>
            </div>
          )}
        </div>
      );
    }
    case 'liars_dice': {
      const yourDice = (gs.yourDice || []) as number[];
      const diceEmoji = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="回合" value={gs.roundNumber || 1} icon="🔄" />
            <InfoPill label="对手骰子" value={`${gs.opponentDiceCount || 0}个`} icon="🎲" />
          </div>
          {yourDice.length > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-white/50 mb-1">你的骰子</p>
              <div className="flex justify-center gap-2 text-2xl">
                {yourDice.map((d, i) => <span key={i}>{diceEmoji[d] || d}</span>)}
              </div>
            </div>
          )}
          {gs.lastBid && (
            <div className="text-center p-2 rounded-lg bg-white/10">
              <p className="text-xs text-white/80">
                当前叫价: <span className="font-semibold text-white">{gs.lastBid.quantity}个{gs.lastBid.faceValue}</span>
              </p>
            </div>
          )}
        </div>
      );
    }
    case 'sealed_bid_auction': {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="回合" value={`${gs.round}/${gs.totalRounds}`} icon="🔨" />
            <InfoPill label="余额" value={`¥${gs.yourBalance ?? 0}`} icon="💰" />
          </div>
          {gs.yourClue && (
            <div className="text-center p-3 rounded-xl bg-white/15">
              <p className="text-[10px] text-white/50 mb-1">你的线索</p>
              <p className="text-white text-sm font-semibold">🔍 {gs.yourClue}</p>
            </div>
          )}
        </div>
      );
    }
    case 'liars_auction': {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="回合" value={`${gs.round}/6`} icon="🎭" />
            <InfoPill label="金币" value={`${gs.yourGold ?? 100}`} icon="🪙" />
          </div>
          {gs.yourClue && (
            <div className="text-center p-3 rounded-xl bg-white/15">
              <p className="text-[10px] text-white/50 mb-1">你的真实线索</p>
              <p className="text-white text-sm font-semibold">🔍 {gs.yourClue}</p>
            </div>
          )}
        </div>
      );
    }
    case 'silicon_storm': {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="回合" value={gs.turnNumber || 1} icon="⚡" />
            <InfoPill label="阶段" value={phase} />
            <InfoPill label="金币" value={gs.yourCoins ?? 0} icon="🪙" />
            <InfoPill label="生命" value={`${'❤️'.repeat(gs.yourLives ?? 0)}`} />
          </div>
          {(gs.yourRoles || []).length > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-white/50 mb-1">角色牌</p>
              <div className="flex justify-center gap-2">
                {(gs.yourRoles as string[]).map((r: string, i: number) => {
                  const re: Record<string, string> = { assassin: '🗡', merchant: '💰', guardian: '🛡', spy: '🕵️', diplomat: '🤝' };
                  return <span key={i} className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-semibold">{re[r] || '❓'} {r}</span>;
                })}
              </div>
            </div>
          )}
        </div>
      );
    }
    case 'heist_royale': {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <InfoPill label="回合" value={`${gs.round}/${gs.totalRounds}`} icon="💎" />
            <InfoPill label="阶段" value={phase} />
            <InfoPill label="金币" value={`${gs.yourGold ?? 0}`} icon="🪙" />
          </div>
          {(gs.yourHand || []).length > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-white/50 mb-1">手牌</p>
              <div className="flex justify-center gap-2">
                {(gs.yourHand as { type: string; value: number }[]).map((c: any, i: number) => (
                  <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${c.type === 'sabotage' ? 'bg-red-500/30 text-red-200' : 'bg-emerald-500/30 text-emerald-200'}`}>
                    {c.type === 'sabotage' ? '💣' : '⚡'} {c.value > 0 ? `+${c.value}` : c.value}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gs.roundResult && (
            <div className="text-center p-3 rounded-xl bg-white/15">
              <p className="text-white text-sm font-semibold">{gs.roundResult.success ? '✅ 任务成功!' : '❌ 任务失败'}</p>
            </div>
          )}
        </div>
      );
    }
    default:
      return <pre className="text-white text-xs font-mono text-left whitespace-pre-wrap break-all">{JSON.stringify(gs, null, 2).slice(0, 500)}</pre>;
  }
}
