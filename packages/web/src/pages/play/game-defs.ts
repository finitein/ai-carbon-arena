// ============================================================
// Game definitions & utilities
// ============================================================

export interface GameDef {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  desc: string;
  tags: string[];
  players: string;
  duration: string;
  color: string;
}

export const GAMES: GameDef[] = [
  { id: 'texas_holdem_hu', name: 'HU 德州扑克', nameEn: "Texas Hold'em", emoji: '🃏', desc: '不完全信息 · Bluffing · 筹码管理', tags: ['扑克', '经典'], players: '2人', duration: '~10 min', color: 'from-emerald-500 to-emerald-700' },
  { id: 'kuhn_poker', name: 'Kuhn Poker', nameEn: 'Kuhn Poker', emoji: '🂡', desc: 'J/Q/K 三张牌极简扑克', tags: ['扑克', '轻量'], players: '2人', duration: '~2 min', color: 'from-teal-500 to-teal-700' },
  { id: 'prisoners_dilemma', name: '囚徒困境', nameEn: "Prisoner's Dilemma", emoji: '🤝', desc: '合作 vs 背叛 · 重复博弈', tags: ['博弈论', '经典'], players: '2人', duration: '~3 min', color: 'from-blue-500 to-blue-700' },
  { id: 'split_or_steal', name: 'Split or Steal', nameEn: 'Split or Steal', emoji: '💰', desc: '谈判 + 平分/独吞', tags: ['博弈论', '社交'], players: '2人', duration: '~8 min', color: 'from-amber-500 to-amber-700' },
  { id: 'ultimatum', name: '最后通牒', nameEn: 'Ultimatum Game', emoji: '⚖️', desc: '提议分配 · 公平博弈', tags: ['博弈论'], players: '2人', duration: '~1 min', color: 'from-indigo-500 to-indigo-700' },
  { id: 'liars_dice', name: '大话骰', nameEn: "Liar's Dice", emoji: '🎲', desc: '喊数/质疑 · 概率推理', tags: ['Bluffing'], players: '2人', duration: '~5 min', color: 'from-red-500 to-red-700' },
  { id: 'sealed_bid_auction', name: '密封竞价拍卖', nameEn: 'Sealed-Bid Auction', emoji: '🔨', desc: 'Vickrey 拍卖 · 私密线索', tags: ['拍卖', '博弈论'], players: '2人', duration: '~3 min', color: 'from-purple-500 to-purple-700' },
  { id: 'liars_auction', name: '谎言拍卖行', nameEn: "Liar's Auction", emoji: '🎭', desc: '线索可说谎 · 社交欺骗', tags: ['拍卖', '社交'], players: '2人', duration: '~10 min', color: 'from-pink-500 to-pink-700' },
  { id: 'silicon_storm', name: '碳硅风暴', nameEn: 'Silicon Storm', emoji: '⚡', desc: '角色 Bluffing · 质疑/反制', tags: ['角色', 'Bluffing'], players: '2人', duration: '~10 min', color: 'from-orange-500 to-orange-700' },
  { id: 'heist_royale', name: '碳硅夺宝', nameEn: 'Heist Royale', emoji: '💎', desc: '6人局 · 合作/背叛 · 你+5AI', tags: ['合作', '社交'], players: '6人', duration: '~15 min', color: 'from-rose-500 to-rose-700' },
];

export type MatchMode = 'vs_ai' | 'vs_human' | 'mixed';
export type PageView = 'lobby' | 'matching' | 'playing' | 'finished';

/** Format an action object into a human-readable label */
export function formatActionLabel(action: Record<string, unknown>): string {
  const t = String(action.type || '');
  const labels: Record<string, string> = {
    fold: '弃牌', check: '过牌', call: '跟注', bet: '下注', raise: '加注',
    cooperate: '合作', defect: '背叛', split: '平分', steal: '独吞',
    accept: '接受', reject: '拒绝', challenge: '质疑', pass: '放行',
    income: '收入+1', foreign_aid: '外援+2', tax: '收税+3', silence: '沉默',
    speak: '💬 发言', message: '💬 发言', chat: '💬 发言', declare: '📢 宣言',
    end_discussion: '⏭ 结束讨论', end_negotiate: '⏭ 结束谈判',
    commit_card: `出牌 #${action.cardIndex ?? '?'}`, exchange: '交换',
  };
  let label = labels[t] || t;
  if (action.amount !== undefined) label += ` ${action.amount}`;
  if (action.myShare !== undefined) label = `提议: 我拿 ${action.myShare}`;
  if (action.target) label += ` → ${String(action.target).slice(0, 10)}`;
  if (action.tier === 'light') label = '🟡 轻微指控' + (action.target ? ` → ${String(action.target).slice(0, 10)}` : '');
  if (action.tier === 'heavy') label = '🔴 强力指控' + (action.target ? ` → ${String(action.target).slice(0, 10)}` : '');
  if (action.claimedRole) label += ` (${action.claimedRole})`;
  if (t === 'bid' && action.quantity) label = `喊 ${action.quantity}个${action.faceValue}`;
  if (t === 'propose') label = `提议: 我拿 ${action.myShare ?? '?'}`;
  if (t === 'block') label = `🛡 阻挡 (${action.claimedRole || 'guardian'})`;
  if (t === 'assassinate') label = '🗡 刺杀';
  if (t === 'coup') label = '⚔ 政变';
  if (t === 'steal') label = '🔓 偷取';
  return label;
}
