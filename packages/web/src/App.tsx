import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Terminal, Sun, Moon,
  Home, Gamepad2, BarChart3, User,
} from 'lucide-react';

import HomePage from '@/pages/HomePage';
import PlayPage from '@/pages/PlayPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import MatchesPage from '@/pages/MatchesPage';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen pb-24 text-on-background transition-colors duration-500">
      {/* Background Animation */}
      <div className="bg-aurora"></div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 glass-panel-high border-b-0 rounded-b-2xl md:rounded-b-3xl">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-primary/20 backdrop-blur-md flex items-center justify-center text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
            <Terminal className="w-5 h-5" />
          </div>
          <h1 className="font-headline tracking-tighter text-lg md:text-xl font-bold text-on-surface bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text text-transparent">
            C—S ARENA
          </h1>
        </NavLink>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface bg-surface-container-highest/50 backdrop-blur-md transition-all duration-300 rounded-[14px] active:scale-90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-2 sm:px-4">
        <div className="page-enter" key={location.pathname}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/matches" element={<MatchesPage />} />
          </Routes>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full h-auto glass-panel-high rounded-t-3xl z-50 flex justify-around items-center px-4 py-3 pb-safe border-t-0 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-colors duration-500">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-6 h-full active:scale-90 transition-all duration-300 rounded-2xl ${
                isActive
                  ? 'bg-primary/20 text-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/30'
              }`
            }
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="font-headline text-[10px] font-bold tracking-widest">HOME</span>
          </NavLink>
          <NavLink
            to="/play"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-6 h-full active:scale-90 transition-all duration-300 rounded-2xl ${
                isActive
                  ? 'bg-primary/20 text-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/30'
              }`
            }
          >
            <Gamepad2 className="w-6 h-6 mb-1" />
            <span className="font-headline text-[10px] font-bold tracking-widest">GAMES</span>
          </NavLink>
          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-6 h-full active:scale-90 transition-all duration-300 rounded-2xl ${
                isActive
                  ? 'bg-primary/20 text-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/30'
              }`
            }
          >
            <BarChart3 className="w-6 h-6 mb-1" />
            <span className="font-headline text-[10px] font-bold tracking-widest">BOARD</span>
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-6 h-full active:scale-90 transition-all duration-300 rounded-2xl ${
                isActive
                  ? 'bg-primary/20 text-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/30'
              }`
            }
          >
            <User className="w-6 h-6 mb-1" />
            <span className="font-headline text-[10px] font-bold tracking-widest">ME</span>
          </NavLink>
      </nav>
    </div>
  );
}
