import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const [sent, setSent] = useState(false);

  const onSubmit = () => {
    // Backend endpoint not available yet; simulate success and provide guidance
    setSent(true);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-[#F8F9FA] text-[#212529] dark:bg-[#1A1D21] dark:text-[#E9ECEF]">
      <div className="w-full max-w-2xl rounded-xl shadow-lg bg-[#F8F9FA] dark:bg-[#1A1D21] p-8 sm:p-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Forgot Password</h1>
        <p className="mt-2 text-base text-[#495057] dark:text-[#E9ECEF]/70">Enter your email and we’ll send reset instructions if your account exists.</p>

        {sent ? (
          <div className="mt-8 rounded-md border border-[#DEE2E6] dark:border-[#495057] p-4 text-sm">
            If this email is registered, you’ll receive a reset link shortly. For urgent help, contact your admin.
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="flex flex-col">
                <span className="text-sm font-medium pb-2">Email</span>
                <input
                  className="form-input h-12 rounded-lg border border-[#DEE2E6] dark:border-[#495057] bg-white dark:bg-[#101922] px-4"
                  type="email"
                  placeholder="you@example.com"
                  {...form.register('email')}
                />
              </label>
              {form.formState.errors.email && <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>}
            </div>
            <button className="flex w-full items-center justify-center rounded-lg bg-[#4A90E2] h-12 px-6 text-base font-semibold text-white shadow-sm hover:bg-[#4A90E2]/90" type="submit">
              Send reset link
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-[#495057] dark:text-[#E9ECEF]/70">
            Back to <Link to="/login" className="font-medium text-[#4A90E2] hover:underline">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
