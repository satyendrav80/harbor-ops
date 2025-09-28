import { useNavigate, Link } from 'react-router-dom';
import AuthForm from '../components/forms/AuthForm';

export default function Signup() {
  const navigate = useNavigate();

  async function onSubmit(values: { name?: string; email: string; password: string }) {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: values.email, password: values.password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Signup failed');
    navigate('/login');
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Sign up</h1>
      <AuthForm mode="signup" onSubmit={onSubmit} />
      <div className="mt-3">
        Already have an account? <Link className="text-blue-600" to="/login">Log in</Link>
      </div>
    </div>
  );
}
