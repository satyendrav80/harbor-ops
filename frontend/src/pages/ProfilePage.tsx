/* Purpose: User profile summary */
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import api from '../lib/api';
import { useAuth } from '../state/AuthContext';

type Profile = { id: string; email: string; createdAt?: string };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .get('/auth/me')
      .then((res) => {
        if (!isMounted) return;
        setProfile(res.data);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Unable to load profile data.';
        setError(message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const email = profile?.email ?? user?.email ?? '—';
  const userId = profile?.id ?? user?.id ?? '—';
  const createdAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  const initials = useMemo(() => {
    if (!email || email === '—') return 'U';
    const localPart = email.split('@')[0] ?? email;
    const sanitized = localPart.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (sanitized.length >= 2) return sanitized.slice(0, 2);
    if (sanitized.length === 1) return sanitized;
    return email.charAt(0).toUpperCase();
  }, [email]);

  const detailItems = [
    { label: 'Email address', value: email, mono: false },
    { label: 'User ID', value: userId, mono: true },
    { label: 'Created on', value: createdAt, mono: false },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Review current session details and manage access to the Harbor-Ops console."
      />

      <section className="card space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
              <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
              <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#15213a] text-xl font-semibold text-slate-100">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{email}</h2>
                <p className="text-sm text-slate-400">Signed in account</p>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-3">
              {detailItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[#101a33] px-4 py-5">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</dt>
                  <dd
                    className={`mt-2 text-sm text-slate-100 ${
                      item.mono ? 'font-mono text-base tracking-tight text-slate-200' : ''
                    }`}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </div>
  );
}
