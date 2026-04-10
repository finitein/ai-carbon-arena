/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Terminal,
  User,
  Info,
  ChevronRight,
  Hexagon,
  Scale,
  Plus,
  ListFilter,
  Layers,
  Gavel,
  Dices,
  Home,
  Gamepad2,
  BarChart3,
  Sun,
  Moon,
  Settings
} from "lucide-react";

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen pb-24 bg-background text-on-background transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Terminal className="w-4 h-4" />
          </div>
          <h1 className="font-headline uppercase tracking-tighter text-xl font-bold text-on-surface">
            CARBON-SILICON
          </h1>
        </div>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded-full active:scale-95"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      <main className="pt-20 px-4 space-y-8 max-w-md mx-auto">
        {/* Hero Section */}
        <section className="relative w-full aspect-[16/10] overflow-hidden bg-slate-900 rounded-xl shadow-md border border-outline-variant/20">
          <img
            alt="HU Texas Hold'em AI Arena"
            className="w-full h-full object-cover opacity-70 dark:opacity-60"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxY1a6LV7Tim21dKs1dQYgwQs6nracShvoeII7nVb85h7cP5Vo_XAoYeggU1EvkPhxjCZPvJwuzPztPxnhStDzSRoe3PoZsplFQr2zkLfo6V6CcvC6KVIT7D4ThErbVy3rA_PDG8U6E8LsceiaBsl163VVNMEeiPe5-UIDeKj29eKAdp5c-R_CnhxG8mwC4lmNEXTkQXztQhBAwMWd5Wb48L8PfhMdHu7Ww26Z6v1r1VZoLXtQMi7WWdAVRWFfVwAkb9DsO7lWKyyV"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-primary dark:text-secondary font-mono-data text-xs tracking-widest font-bold">
                LIVE TRENDING
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary animate-pulse"></div>
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-white mb-4 tracking-tighter">
              HU 德州扑克
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button className="bg-primary text-white px-8 py-2 font-headline font-bold text-sm tracking-widest active:scale-95 transition-transform rounded-md">
                  START
                </button>
                <button className="w-10 h-10 border border-white/30 flex items-center justify-center text-white backdrop-blur-md rounded-md">
                  <Info className="w-5 h-5" />
                </button>
              </div>
              <div className="text-right">
                <p className="font-mono-data text-[10px] text-white/70">
                  ACTIVE NODES
                </p>
                <p className="font-mono-data text-blue-300 dark:text-secondary text-sm font-bold">
                  1,204.88
                </p>
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
            <ChevronRight className="text-primary w-4 h-4" />
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {/* Protocol 1 */}
            <div className="flex-shrink-0 w-44 bg-surface-container p-5 border border-outline-variant/50 rounded-xl shadow-sm dark:border-l-2 dark:border-l-primary/40 dark:border-y-0 dark:border-r-0 dark:rounded-none dark:shadow-none">
              <div className="flex justify-between items-start mb-6">
                <div className="w-8 h-8 bg-primary/10 dark:bg-transparent rounded-lg flex items-center justify-center">
                  <Hexagon className="text-primary w-5 h-5" />
                </div>
                <span className="font-mono-data text-[10px] text-primary dark:text-secondary font-bold bg-primary/10 dark:bg-transparent px-2 py-0.5 rounded">
                  WIN 64%
                </span>
              </div>
              <h4 className="font-headline font-bold text-base mb-1">
                Kuhn Poker
              </h4>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
                Theory Evolution
              </p>
            </div>
            {/* Protocol 2 */}
            <div className="flex-shrink-0 w-44 bg-surface-container p-5 border border-outline-variant/50 rounded-xl shadow-sm dark:border-l-2 dark:border-l-outline-variant/40 dark:border-y-0 dark:border-r-0 dark:rounded-none dark:shadow-none">
              <div className="flex justify-between items-start mb-6">
                <div className="w-8 h-8 bg-outline/10 dark:bg-transparent rounded-lg flex items-center justify-center">
                  <Scale className="text-outline w-5 h-5" />
                </div>
                <span className="font-mono-data text-[10px] text-outline font-bold bg-outline/10 dark:bg-transparent px-2 py-0.5 rounded">
                  NEUTRAL
                </span>
              </div>
              <h4 className="font-headline font-bold text-base mb-1">
                囚徒困境
              </h4>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
                Nash Equilibrium
              </p>
            </div>
            {/* Add New */}
            <div className="flex-shrink-0 w-44 bg-transparent border-2 border-dashed border-outline-variant/50 p-5 flex flex-col items-center justify-center rounded-xl dark:bg-surface-container-lowest dark:border-outline-variant/10 dark:border dark:rounded-none">
              <Plus className="text-outline-variant w-6 h-6 mb-2" />
              <span className="font-headline text-[10px] font-bold text-outline-variant tracking-widest">
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
            <ListFilter className="text-primary w-4 h-4" />
          </div>
          <div className="space-y-3">
            {/* Arena 1 */}
            <div className="group flex items-center bg-surface-container p-4 gap-4 rounded-xl border border-outline-variant/30 shadow-sm dark:rounded-none dark:shadow-none dark:bg-surface-container-high dark:border-none active:scale-[0.98] transition-transform">
              <div className="w-14 h-14 bg-primary/10 dark:bg-surface-container-lowest rounded-lg dark:rounded-none flex items-center justify-center">
                <Layers className="text-primary w-7 h-7" />
              </div>
              <div className="flex-1">
                <h4 className="font-headline font-bold text-base text-on-surface">
                  Split or Steal
                </h4>
                <p className="text-[10px] text-on-surface-variant font-mono-data mt-0.5">
                  SOCIAL_ENGINEERING_v2
                </p>
              </div>
              <div className="text-right">
                <ChevronRight className="text-outline group-active:text-primary transition-colors w-5 h-5" />
              </div>
            </div>
            {/* Arena 2 */}
            <div className="group flex items-center bg-surface-container p-4 gap-4 rounded-xl border border-outline-variant/30 shadow-sm dark:rounded-none dark:shadow-none dark:bg-surface-container-high dark:border-none active:scale-[0.98] transition-transform">
              <div className="w-14 h-14 bg-primary/10 dark:bg-surface-container-lowest rounded-lg dark:rounded-none flex items-center justify-center">
                <Gavel className="text-primary w-7 h-7" />
              </div>
              <div className="flex-1">
                <h4 className="font-headline font-bold text-base text-on-surface">
                  最后通牒
                </h4>
                <p className="text-[10px] text-on-surface-variant font-mono-data mt-0.5">
                  RESOURCE_ALLOCATION
                </p>
              </div>
              <div className="text-right">
                <ChevronRight className="text-outline group-active:text-primary transition-colors w-5 h-5" />
              </div>
            </div>
            {/* Arena 3 */}
            <div className="group flex items-center bg-surface-container p-4 gap-4 rounded-xl border border-outline-variant/30 shadow-sm dark:rounded-none dark:shadow-none dark:bg-surface-container-high dark:border-none active:scale-[0.98] transition-transform">
              <div className="w-14 h-14 bg-primary/10 dark:bg-surface-container-lowest rounded-lg dark:rounded-none flex items-center justify-center">
                <Dices className="text-primary w-7 h-7" />
              </div>
              <div className="flex-1">
                <h4 className="font-headline font-bold text-base text-on-surface">
                  大话骰
                </h4>
                <p className="text-[10px] text-on-surface-variant font-mono-data mt-0.5">
                  STOCHASTIC_BLUFFING
                </p>
              </div>
              <div className="text-right">
                <ChevronRight className="text-outline group-active:text-primary transition-colors w-5 h-5" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full h-auto bg-surface/90 backdrop-blur-md z-50 flex justify-around items-center px-2 py-3 pb-safe border-t border-outline-variant/20 dark:bg-[#10131a] dark:border-[#44474c]/15 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-colors duration-300">
        <a
          className="flex flex-col items-center justify-center bg-primary/10 dark:bg-transparent text-primary dark:border-t-2 dark:border-primary rounded-xl dark:rounded-none px-4 py-1.5 dark:py-2 dark:pt-2 w-16 dark:w-full h-full active:scale-95 transition-transform duration-150"
          href="#"
        >
          <Home className="w-5 h-5 dark:w-6 dark:h-6" />
          <span className="font-headline text-[10px] font-bold tracking-widest mt-1">
            HOME
          </span>
        </a>
        <a
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-[#44474c] px-4 py-1.5 dark:py-2 dark:pt-2 w-16 dark:w-full h-full hover:text-primary dark:hover:bg-[#1d2026] rounded-xl dark:rounded-none active:scale-95 transition-all duration-150"
          href="#"
        >
          <Gamepad2 className="w-5 h-5 dark:w-6 dark:h-6" />
          <span className="font-headline text-[10px] font-bold tracking-widest mt-1">
            GAMES
          </span>
        </a>
        <a
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-[#44474c] px-4 py-1.5 dark:py-2 dark:pt-2 w-16 dark:w-full h-full hover:text-primary dark:hover:bg-[#1d2026] rounded-xl dark:rounded-none active:scale-95 transition-all duration-150"
          href="#"
        >
          <BarChart3 className="w-5 h-5 dark:w-6 dark:h-6" />
          <span className="font-headline text-[10px] font-bold tracking-widest mt-1">
            BOARD
          </span>
        </a>
        <a
          className="flex flex-col items-center justify-center text-on-surface-variant dark:text-[#44474c] px-4 py-1.5 dark:py-2 dark:pt-2 w-16 dark:w-full h-full hover:text-primary dark:hover:bg-[#1d2026] rounded-xl dark:rounded-none active:scale-95 transition-all duration-150"
          href="#"
        >
          <User className="w-5 h-5 dark:w-6 dark:h-6" />
          <span className="font-headline text-[10px] font-bold tracking-widest mt-1">
            ME
          </span>
        </a>
      </nav>
    </div>
  );
}
