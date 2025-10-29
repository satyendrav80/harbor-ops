/* Purpose: Provide authentication context with JWT persistence */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuthTokenGetter } from '../lib/api';

type AuthUser = { id: string; email: string };

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt'));
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => token);
    if (token) localStorage.setItem('jwt', token);
    else localStorage.removeItem('jwt');
  }, [token]);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    api.get('/auth/me').then((res) => setUser(res.data)).catch(() => setUser(null));
  }, [token]);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(() => ({ token, user, login, logout }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
