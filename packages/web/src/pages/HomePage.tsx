import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Hexagon, Scale, Plus, ListFilter,
  Layers, Gavel, Dices, Info,
} from 'lucide-react';

const ARENA_ITEMS = [
  { id: 'split_or_steal', name: 'Split or Steal', tag: 'SOCIAL_ENGINEERING_v2', icon: Layers },
  { id: 'ultimatum', name: '最后通牒', tag: 'RESOURCE_ALLOCATION', icon: Gavel },
  { id: 'liars_dice', name: '大话骰', tag: 'STOCHASTIC_BLUFFING', icon: Dices },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-md mx-auto pt-2 pb-8">
      {/* Hero Section */}
      <section className="relative w-full aspect-[16/10] overflow-hidden rounded-[28px] glass-panel-high border-x-0 border-y-0 sm:border border-outline-variant/30 shadow-xl group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-secondary font-mono-data text-[10px] tracking-widest font-bold bg-secondary/20 px-2 py-0.5 rounded-md backdrop-blur-md">
              LIVE TRENDING
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_var(--color-secondary)]"></div>
          </div>
          <h2 className="font-headline text-3xl font-extrabold text-white mb-5 tracking-tighter drop-shadow-md">
            HU 德州扑克
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/play?game=texas_holdem_hu&autostart=true')}
                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 px-8 py-2.5 font-headline font-bold text-sm tracking-widest active:scale-95 transition-all duration-300 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                START
              </button>
              <button className="w-10 h-10 border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white backdrop-blur-md rounded-xl transition-colors">
                <Info className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right">
              <p className="font-mono-data text-[10px] text-white/50 mb-0.5">ACTIVE NODES</p>
              <p className="font-mono-data text-white text-sm font-bold tracking-wider">1,204.88</p>
            </div>
          </div>
        </div>
      </section>

      {/* Saved Protocols */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-headline text-xs font-bold tracking-widest text-on-surface-variant uppercase">
            SAVED_PROTOCOLS
          </h3>
          <ChevronRight className="text-primary w-4 h-4 opacity-70" />
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
          {/* Protocol 1 */}
          <div
            onClick={() => navigate('/play?game=kuhn_poker&autostart=true')}
            className="cursor-pointer flex-shrink-0 w-44 glass-panel p-5 rounded-[24px] active:scale-[0.97] transition-all duration-300 hover:shadow-lg hover:border-primary/30"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <Hexagon className="text-primary w-5 h-5" />
              </div>
              <span className="font-mono-data text-[10px] text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">
                WIN 64%
              </span>
            </div>
            <h4 className="font-headline font-bold text-base mb-1 text-on-surface">Kuhn Poker</h4>
            <p className="text-[10px] text-on-surface-variant font-mono-data tracking-tight">THEORY_EVOLUTION</p>
          </div>
          {/* Protocol 2 */}
          <div
            onClick={() => navigate('/play?game=prisoners_dilemma&autostart=true')}
            className="cursor-pointer flex-shrink-0 w-44 glass-panel p-5 rounded-[24px] active:scale-[0.97] transition-all duration-300 hover:shadow-lg hover:border-outline/50"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 bg-outline/10 rounded-xl flex items-center justify-center border border-outline/20">
                <Scale className="text-outline w-5 h-5" />
              </div>
              <span className="font-mono-data text-[10px] text-on-surface-variant font-bold bg-outline/10 border border-outline/20 px-2 py-1 rounded-md">
                NEUTRAL
              </span>
            </div>
            <h4 className="font-headline font-bold text-base mb-1 text-on-surface">囚徒困境</h4>
            <p className="text-[10px] text-on-surface-variant font-mono-data tracking-tight">NASH_EQUILIBRIUM</p>
          </div>
          {/* Add New */}
          <div
            onClick={() => navigate('/play')}
            className="cursor-pointer flex-shrink-0 w-44 bg-surface-container-lowest/30 backdrop-blur-sm border-2 border-dashed border-outline-variant/40 p-5 flex flex-col items-center justify-center rounded-[24px] active:scale-[0.97] transition-all duration-300 hover:bg-surface-container/50 hover:border-outline-variant"
          >
            <div className="w-10 h-10 bg-outline-variant/10 rounded-full flex items-center justify-center mb-3">
              <Plus className="text-on-surface-variant w-5 h-5" />
            </div>
            <span className="font-headline text-[10px] font-bold text-on-surface-variant tracking-widest">
              ADD_NEW
            </span>
          </div>
        </div>
      </section>

      {/* Discover Arenas */}
      <section className="space-y-4 pb-12">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-headline text-xs font-bold tracking-widest text-on-surface-variant uppercase">
            DISCOVER_ARENAS
          </h3>
          <ListFilter className="text-primary w-4 h-4 opacity-70" />
        </div>
        <div className="space-y-3">
          {ARENA_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/play?game=${item.id}&autostart=true`)}
                className="cursor-pointer group flex items-center glass-panel p-4 gap-4 rounded-[20px] active:scale-[0.98] transition-all duration-300 hover:shadow-md hover:border-primary/20"
              >
                <div className="w-12 h-12 bg-surface-container-highest rounded-xl flex items-center justify-center shadow-inner border border-outline-variant/30">
                  <Icon className="text-primary w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-base text-on-surface mb-0.5">{item.name}</h4>
                  <p className="text-[10px] text-on-surface-variant font-mono-data">{item.tag}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ChevronRight className="text-outline-variant group-hover:text-primary transition-colors w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
