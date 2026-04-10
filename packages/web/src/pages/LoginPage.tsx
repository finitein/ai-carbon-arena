import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();

  // If already logged in, show profile
  if (user) {
    return (
      <div className="px-4 pt-8 max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="font-headline text-xl font-bold text-on-surface">{user.displayName}</h2>
          <p className="text-sm text-on-surface-variant mt-1">{user.email}</p>
          <p className="font-mono-data text-xs text-primary mt-2">RATING: {user.rating}</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/play')}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform"
          >
            START GAME
          </button>
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl border border-outline-variant text-on-surface-variant font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform"
          >
            LOGOUT
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/play');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-8 max-w-sm mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">⚔️</span>
        </div>
        <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">ACCESS_TERMINAL</h1>
        <p className="text-on-surface-variant text-xs mt-1 font-mono-data tracking-wider">AUTHENTICATE TO PROCEED</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container p-6 rounded-xl border border-outline-variant/30 dark:rounded-none dark:border-l-2 dark:border-l-primary/40 dark:border-y-0 dark:border-r-0">
        <div>
          <label htmlFor="email" className="block text-[10px] font-headline font-bold text-on-surface-variant mb-1.5 tracking-widest uppercase">
            EMAIL_ID
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test1@arena.cc"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all dark:rounded-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[10px] font-headline font-bold text-on-surface-variant mb-1.5 tracking-widest uppercase">
            PASSKEY
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Test@12345"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all dark:rounded-none"
          />
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-error/10 border border-error/20">
            <p className="text-xs text-error">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-lg bg-primary text-on-primary font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed dark:rounded-none"
        >
          {isSubmitting ? 'AUTHENTICATING...' : 'LOGIN'}
        </button>
      </form>

      {/* Test accounts hint */}
      <div className="mt-6 bg-surface-container p-4 rounded-xl border border-outline-variant/30 dark:rounded-none dark:border-l dark:border-l-outline-variant/20 dark:border-y-0 dark:border-r-0">
        <p className="text-[10px] font-headline font-bold text-on-surface-variant mb-2 tracking-widest">📋 TEST_ACCOUNTS</p>
        <div className="space-y-1.5">
          {[
            { email: 'test1@arena.cc', name: 'Player-Alpha' },
            { email: 'test2@arena.cc', name: 'Player-Beta' },
            { email: 'test3@arena.cc', name: 'Player-Gamma' },
          ].map(acc => (
            <button
              key={acc.email}
              type="button"
              onClick={() => { setEmail(acc.email); setPassword('Test@12345'); }}
              className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors dark:rounded-none"
            >
              <span className="text-xs text-on-surface font-mono-data">{acc.email}</span>
              <span className="text-[10px] text-on-surface-variant">{acc.name}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-outline mt-2 font-mono-data">PASSKEY: Test@12345</p>
      </div>

      {/* Register link */}
      <div className="text-center mt-6">
        <Link to="/register" className="text-xs text-primary hover:underline font-headline tracking-wider">
          CREATE_NEW_AGENT →
        </Link>
      </div>
    </div>
  );
}
