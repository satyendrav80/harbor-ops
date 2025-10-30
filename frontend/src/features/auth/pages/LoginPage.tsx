import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { mutate, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { usernameOrEmail: '', password: '' },
  });

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  const onSubmit = (values: FormValues) => {
    mutate(values, { onSuccess: () => navigate('/dashboard', { replace: true }) });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-[#F8F9FA] text-[#212529] dark:bg-[#1A1D21] dark:text-[#E9ECEF]">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl shadow-lg md:grid md:grid-cols-2">
        {/* Left brand panel */}
        <div className="relative hidden items-center justify-center bg-[#4A90E2]/10 dark:bg-[#4A90E2]/20 p-8 md:flex flex-col">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-5"
            style={{ backgroundImage: 'url(\'https://lh3.googleusercontent.com/aida-public/AB6AXuBgMikY6R8-BCECzRDU7Kar54HbK3aiJcz69rtYQgT2fZYhilz27--CaxL5fCYlR22rxxB6h59DVHzqHFZeHHW3JjmtyeR_a1mb4gFmFc8RgTTYvr8OwCKYDvPUzS7Vmfq1BtC3tiG5ruGsXYFNiUfJ0ixguqrxkgYoQMFW70T2FAIUiVGD5CFTyAjgYOp--PzOS6N_xnFzOSrNQikj2gxuwM2aT59i1lTfIehA7hZOQltGQvp_54IJBmZZJLlmtopotrBOIbuBnIA\')' }}
          />
          <div className="relative z-10 text-center">
            <div className="mb-4 flex justify-center text-[#4A90E2]">
              <img src="/harbor-ops.svg" alt="HarborOps" className="h-16 w-16" />
            </div>
            <h2 className="text-3xl font-bold text-[#212529] dark:text-white">HarborOps</h2>
            <p className="mt-2 text-base text-[#495057] dark:text-[#E9ECEF]/80">Centralized Operations Intelligence.</p>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex flex-col justify-center bg-[#F8F9FA] dark:bg-[#1A1D21] p-8 sm:p-12">
          <div className="w-full max-w-md">
            <div className="text-center md:hidden mb-8">
              <div className="mb-4 flex justify-center text-[#4A90E2]">
                <img src="/harbor-ops.svg" alt="HarborOps" className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold text-[#212529] dark:text-white">HarborOps</h2>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sign In</h1>
            <p className="mt-2 text-base text-[#495057] dark:text-[#E9ECEF]/70">Welcome back! Please enter your credentials.</p>

            <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div>
                <label className="flex flex-col">
                  <span className="text-sm font-medium leading-normal pb-2">Username or Email</span>
                  <input
                    className="form-input flex w-full rounded-lg border border-[#DEE2E6] dark:border-[#495057] bg-white dark:bg-[#101922] h-12 px-4 text-base placeholder:text-[#6c757d] dark:placeholder:text-[#adb5bd]"
                    placeholder="e.g. user@example.com"
                    type="email"
                    autoComplete="username"
                    {...form.register('usernameOrEmail')}
                  />
                </label>
                {form.formState.errors.usernameOrEmail && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.usernameOrEmail.message}</p>
                )}
              </div>

              <div>
                <label className="flex flex-col">
                  <span className="text-sm font-medium leading-normal pb-2">Password</span>
                  <div className="relative flex w-full items-stretch">
                    <input
                      className="form-input flex w-full rounded-lg border border-[#DEE2E6] dark:border-[#495057] bg-white dark:bg-[#101922] h-12 px-4 pr-12 text-base placeholder:text-[#6c757d] dark:placeholder:text-[#adb5bd]"
                      placeholder="Enter your password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-[#495057] dark:text-[#adb5bd] hover:text-[#4A90E2]"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end">
                <Link to="#" className="text-sm font-medium text-[#4A90E2] hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <div>
                <button
                  className="flex w-full items-center justify-center rounded-lg bg-[#4A90E2] h-12 px-6 text-base font-semibold text-white shadow-sm hover:bg-[#4A90E2]/90 disabled:opacity-50"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? 'Logging in…' : 'Log In'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#495057] dark:text-[#E9ECEF]/70">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-[#4A90E2] hover:underline">Create Account</Link>
              </p>
            </div>

            <p className="mt-8 text-center text-xs text-[#495057] dark:text-[#E9ECEF]/50">© 2025 HarborOps. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


