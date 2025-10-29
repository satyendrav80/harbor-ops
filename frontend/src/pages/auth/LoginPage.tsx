/* Purpose: Authentication login screen */
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuth } from '../../state/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await login(email, password);
      navigate('/profile');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in to Harbor-Ops"
      description="Monitor servers, deployments, and credentials from one secure console."
      footer={<span>No account? <Link to="/signup">Create one</Link></span>}
    >
      <form onSubmit={onSubmit}>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="text-red-400 text-sm" role="alert">{error}</div>}
        <div className="flex w-full"><Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button></div>
      </form>
    </AuthLayout>
  );
}
