/* Purpose: User profile summary */
import { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';
import api from '../lib/api';

type Profile = { id: string; email: string; createdAt?: string };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/auth/me').then((res) => setProfile(res.data)).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-slate-400">Review current session details and manage your account.</p>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      <div className="grid gap-3 text-sm">
        <div>
          <span className="text-slate-400">Email</span>
          <div className="text-white text-base">{profile?.email || user?.email}</div>
        </div>
        <div>
          <span className="text-slate-400">User ID</span>
          <div className="font-mono text-base">{profile?.id || user?.id || '—'}</div>
        </div>
        <div>
          <span className="text-slate-400">Created</span>
          <div>{profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : '—'}</div>
        </div>
      </div>
    </div>
  );
}
