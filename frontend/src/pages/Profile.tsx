import { useEffect, useState } from 'react';
import { useAuth } from '../state/auth';
import AppShell from '../components/layout/AppShell';

export default function Profile() {
  const { token } = useAuth();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load profile');
        setUser(data);
      } catch (err: any) {
        setError(err.message);
      }
    }
    if (token) load();
  }, [token]);

  return (
    <AppShell>
      {error && <div className="p-6 text-red-600">{error}</div>}
      {!user ? (
        <div className="p-6">Loading...</div>
      ) : (
        <div className="p-6 card">
          <h1 className="text-xl font-semibold mb-2">Profile</h1>
          <div>Id: {user.id}</div>
          <div>Email: {user.email}</div>
        </div>
      )}
    </AppShell>
  );
}
