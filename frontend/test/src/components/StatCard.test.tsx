import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../src/features/auth/context/AuthContext';
import { ThemeProvider } from '../../../src/components/common/ThemeProvider';
import { StatCard } from '../../../src/features/dashboard/components/StatCard';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('StatCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders with title and value', () => {
    render(<StatCard title="Test Card" value={123} />, { wrapper: createWrapper() });
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<StatCard title="Test Card" value={123} loading={true} />, { wrapper: createWrapper() });
    // When loading, title is replaced by skeleton loaders
    expect(screen.queryByText('Test Card')).not.toBeInTheDocument();
    // Loading skeletons should be present
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays change indicator when provided', () => {
    render(<StatCard title="Test Card" value={123} change={{ value: 5.5, isPositive: true }} />, { wrapper: createWrapper() });
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });
});

