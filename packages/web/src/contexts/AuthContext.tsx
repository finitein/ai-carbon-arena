import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ============================================================
// Auth Context — JWT token + user state management
// ============================================================

interface User {
  id: string;
  email: string;
  displayName: string;
  rating: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('arena_token');
    const savedUser = localStorage.getItem('arena_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('arena_token');
        localStorage.removeItem('arena_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: '登录失败' }));
      throw new Error(err.message || `登录失败 (${res.status})`);
    }

    const data = await res.json();
    const userData: User = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.displayName,
      rating: data.user.rating,
    };

    setToken(data.token);
    setUser(userData);
    localStorage.setItem('arena_token', data.token);
    localStorage.setItem('arena_user', JSON.stringify(userData));
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: displayName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: '注册失败' }));
      throw new Error(err.message || `注册失败 (${res.status})`);
    }

    const data = await res.json();
    const userData: User = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.displayName,
      rating: data.user.rating ?? 1500,
    };

    setToken(data.token);
    setUser(userData);
    localStorage.setItem('arena_token', data.token);
    localStorage.setItem('arena_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('arena_token');
    localStorage.removeItem('arena_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
