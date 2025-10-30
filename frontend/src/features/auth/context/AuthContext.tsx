import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { getMe } from '../../../services/auth';

type AuthUser = { id: string | number; name: string; email: string; permissions?: string[] };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  const doLogin = useCallback((t: string, u: AuthUser) => {
    setToken(t);
    setUser(u);
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const me = await getMe();
      if (me.permissions) {
        setUser((prevUser) => {
          if (!prevUser) return prevUser;
          const updatedUser = {
            ...prevUser,
            permissions: me.permissions,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        });
      }
    } catch (error) {
      // Silent error - permissions refresh failed
    }
  }, [token]);

  const hasPermission = useCallback((p: string) => !!user?.permissions?.includes(p), [user]);

  // Refresh permissions when token changes (on mount or after login)
  useEffect(() => {
    if (token && user) {
      refreshPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only run when token changes

  const value = useMemo(
    () => ({ user, token, login: doLogin, logout, hasPermission, refreshPermissions }),
    [user, token, doLogin, logout, hasPermission, refreshPermissions]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


