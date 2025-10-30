import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Minimum 6 characters'),
    confirm: z.string().min(6, 'Minimum 6 characters'),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FormValues = z.infer<typeof schema>;

export function SignupPage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useRegister();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '', confirm: '' } });

  const onSubmit = (values: FormValues) => {
    setError(null);
    mutate(
      { name: values.name, email: values.email, password: values.password },
      {
        onSuccess: () => navigate('/login', { replace: true }),
        onError: () => setError('Failed to create account. Try a different email.'),
      }
    );
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-[#F8F9FA] dark:bg-background-dark text-[#212529] dark:text-[#E9ECEF]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-2xl rounded-xl shadow-lg bg-[#F8F9FA] dark:bg-background-dark p-8 sm:p-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#212529] dark:text-white">Create Account</h1>
        <p className="mt-2 text-base text-[#495057] dark:text-[#E9ECEF]/70">Start using HarborOps by creating your account.</p>

        <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium pb-2 text-[#212529] dark:text-[#E9ECEF]">Full name</span>
              <input
                className="form-input h-12 rounded-lg border border-[#DEE2E6] dark:border-[#495057] bg-white dark:bg-[#1C252E] px-4 text-[#212529] dark:text-[#E9ECEF] placeholder:text-[#6c757d] dark:placeholder:text-[#adb5bd]"
                type="text"
                placeholder="Jane Doe"
                {...form.register('name')}
              />
            </label>
            {form.formState.errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.name.message}</p>}
          </div>

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium pb-2 text-[#212529] dark:text-[#E9ECEF]">Email</span>
              <input
                className="form-input h-12 rounded-lg border border-[#DEE2E6] dark:border-[#495057] bg-white dark:bg-[#1C252E] px-4 text-[#212529] dark:text-[#E9ECEF] placeholder:text-[#6c757d] dark:placeholder:text-[#adb5bd]"
                type="email"
                placeholder="you@example.com"
                {...form.register('email')}
              />
            </label>
            {form.formState.errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.email.message}</p>}
          </div>

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium pb-2 text-[#212529] dark:text-[#E9ECEF]">Password</span>
              <input
                className="form-input h-12 rounded-lg border border-[#DEE2E6] dark:border-[#495057] bg-white dark:bg-[#1C252E] px-4 text-[#212529] dark:text-[#E9ECEF] placeholder:text-[#6c757d] dark:placeholder:text-[#adb5bd]"
                type="password"
                placeholder="Minimum 6 characters"
                {...form.register('password')}
              />
            </label>
            {form.formState.errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.password.message}</p>}
          </div>

          <div>
            <label className="flex flex-col">
              <span className="text-sm font-medium pb-2 text-[#212529] dark:text-[#E9ECEF]">Confirm password</span>
              <input
                className="form-input h-12 rounded-lg border border-[#DEE2E6] dark:border-[#495057] bg-white dark:bg-[#1C252E] px-4 text-[#212529] dark:text-[#E9ECEF] placeholder:text-[#6c757d] dark:placeholder:text-[#adb5bd]"
                type="password"
                placeholder="Re-enter password"
                {...form.register('confirm')}
              />
            </label>
            {form.formState.errors.confirm && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{form.formState.errors.confirm.message}</p>}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button className="flex w-full items-center justify-center rounded-lg bg-[#4A90E2] dark:bg-primary h-12 px-6 text-base font-semibold text-white shadow-sm hover:bg-[#4A90E2]/90 dark:hover:bg-primary/90 disabled:opacity-50" type="submit" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#495057] dark:text-[#E9ECEF]/70">
            Already have an account? <Link to="/login" className="font-medium text-[#4A90E2] dark:text-[#60A5FA] hover:underline">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
