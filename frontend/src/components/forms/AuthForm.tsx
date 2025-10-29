/* Purpose: Shared auth form for login/signup */
import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

export type AuthFormMode = 'login' | 'signup';

type Props = {
  mode: AuthFormMode;
  onSubmit: (values: { name?: string; email: string; password: string; confirm?: string }) => Promise<void>;
};

export default function AuthForm({ mode, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(mode === 'login' ? 'admin@example.com' : '');
  const [password, setPassword] = useState(mode === 'login' ? 'Admin123!' : '');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup' && password !== confirm) throw new Error('Passwords do not match');
      await onSubmit({ name, email, password, confirm });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {mode === 'signup' && <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />}
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {mode === 'signup' && <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />}
      {error && <div className="text-red-400 text-sm" role="alert">{error}</div>}
      <Button type="submit" disabled={loading}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
    </form>
  );
}
