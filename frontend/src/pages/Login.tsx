import { useAuth } from '../state/auth';
import { useNavigate, Link } from 'react-router-dom';
import AuthForm from '../components/forms/AuthForm';

export default function Login() {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(values: { email: string; password: string }) {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Login failed');
    setToken(data.token);
    navigate('/profile');
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <AuthForm mode="login" onSubmit={onSubmit} />
      <div className="mt-3">
        No account? <Link className="text-blue-600" to="/signup">Sign up</Link>
      </div>
    </div>
  );
}
