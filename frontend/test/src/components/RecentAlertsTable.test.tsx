import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../src/features/auth/context/AuthContext';
import { ThemeProvider } from '../../../src/components/common/ThemeProvider';
import { RecentAlertsTable } from '../../../src/features/dashboard/components/RecentAlertsTable';
import type { RecentAlert } from '../../../src/features/dashboard/types';

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

const mockAlerts: RecentAlert[] = [
  {
    id: 1,
    timestamp: '2m ago',
    item: 'server-db-01',
    status: 'high',
    action: 'Details',
  },
  {
    id: 2,
    timestamp: '15m ago',
    item: 'auth-service',
    status: 'degraded',
    action: 'Details',
  },
];

describe('RecentAlertsTable', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders alerts table with data', () => {
    render(<RecentAlertsTable alerts={mockAlerts} />, { wrapper: createWrapper() });
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    expect(screen.getByText('server-db-01')).toBeInTheDocument();
    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.getByText('2m ago')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<RecentAlertsTable alerts={[]} loading={true} />, { wrapper: createWrapper() });
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no alerts', () => {
    render(<RecentAlertsTable alerts={[]} />, { wrapper: createWrapper() });
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    expect(screen.getByText('No alerts')).toBeInTheDocument();
  });
});

