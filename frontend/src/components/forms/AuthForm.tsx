import { useState } from 'react';
import InputField from './InputField';
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
    <form onSubmit={handleSubmit} className="grid gap-3">
      {mode === 'signup' && (
        <InputField label="Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <InputField label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <InputField label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {mode === 'signup' && (
        <InputField label="Confirm Password" type="password" placeholder="Confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      )}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <Button type="submit" disabled={loading}>
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  );
}
