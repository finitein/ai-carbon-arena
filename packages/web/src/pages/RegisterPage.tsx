import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register(email, password, displayName);
      navigate('/play');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-8 max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">🤖</span>
        </div>
        <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">NEW_AGENT</h1>
        <p className="text-on-surface-variant text-xs mt-1 font-mono-data tracking-wider">REGISTER YOUR IDENTITY</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container p-6 rounded-xl border border-outline-variant/30 dark:rounded-none dark:border-l-2 dark:border-l-primary/40 dark:border-y-0 dark:border-r-0">
        <div>
          <label htmlFor="displayName" className="block text-[10px] font-headline font-bold text-on-surface-variant mb-1.5 tracking-widest uppercase">
            AGENT_NAME
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="MyAgent"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all dark:rounded-none"
          />
        </div>
        <div>
          <label htmlFor="regEmail" className="block text-[10px] font-headline font-bold text-on-surface-variant mb-1.5 tracking-widest uppercase">
            EMAIL_ID
          </label>
          <input
            id="regEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@example.com"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all dark:rounded-none"
          />
        </div>
        <div>
          <label htmlFor="regPassword" className="block text-[10px] font-headline font-bold text-on-surface-variant mb-1.5 tracking-widest uppercase">
            PASSKEY
          </label>
          <input
            id="regPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少8位"
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
          {isSubmitting ? 'CREATING...' : 'CREATE_AGENT'}
        </button>
      </form>

      <div className="text-center mt-6">
        <Link to="/login" className="text-xs text-primary hover:underline font-headline tracking-wider">
          ← ALREADY_REGISTERED
        </Link>
      </div>
    </div>
  );
}
