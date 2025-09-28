import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setAuthTokenGetter } from '../lib/api';

type AuthContextType = {
  token: string | null;
  setToken: (t: string | null) => void;
  user: { id: string; email: string } | null;
  setUser: (u: { id: string; email: string } | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('jwt'));
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    if (token) localStorage.setItem('jwt', token);
    else localStorage.removeItem('jwt');
  }, [token]);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const value = useMemo<AuthContextType>(
    () => ({ token, setToken: setTokenState, user, setUser }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
