import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { getMe } from '../../../services/auth';
import { getSocket, disconnectSocket } from '../../../services/socket';

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
    // Initialize Socket.IO connection after login
    getSocket();
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Disconnect Socket.IO connection on logout
    disconnectSocket();
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const me = await getMe();
      // If user is blocked/pending/rejected or has no permissions, force logout
      if (me.status && me.status !== 'approved') {
        logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return;
      }
      if (!me.permissions || me.permissions.length === 0) {
        logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return;
      }
      setUser((prevUser) => {
        const base = prevUser || { id: me.id, name: me.name || me.email, email: me.email };
        const updatedUser = { ...base, permissions: me.permissions } as typeof base & { permissions: string[] };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser as any;
      });
    } catch (error) {
      // Silent error - permissions refresh failed
    }
  }, [token]);

  const hasPermission = useCallback((p: string) => {
    if (!user?.permissions) return false;
    // Wildcard permission grants all access
    if (user.permissions.includes('*')) return true;
    // Direct permission match
    if (user.permissions.includes(p)) return true;
    // Check for manage permission: if checking "groups:view", also check "groups:manage"
    const [resource] = p.split(':');
    const managePermission = `${resource}:manage`;
    return user.permissions.includes(managePermission);
  }, [user]);

  // Initialize socket connection if token exists on mount
  useEffect(() => {
    if (token) {
      getSocket();
    } else {
      disconnectSocket();
    }
  }, [token]);

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


