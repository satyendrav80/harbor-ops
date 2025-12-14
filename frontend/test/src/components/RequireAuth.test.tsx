import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequireAuth } from '../../../src/components/common/RequireAuth';
import { AuthProvider } from '../../../src/features/auth/context/AuthContext';

const createWrapper = (token?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects to login when not authenticated', () => {
    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>,
      { wrapper: createWrapper() }
    );

    // Should redirect to login
    expect(window.location.pathname).toBe('/login');
  });

  it('renders children when authenticated', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test User', email: 'test@example.com' }));

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>,
      { wrapper: createWrapper('test-token') }
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
