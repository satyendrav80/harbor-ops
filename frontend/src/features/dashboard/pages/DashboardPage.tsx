import { useDashboardStats } from '../hooks/useDashboardStats';
import { useServerStatus } from '../hooks/useServerStatus';
import { useServiceHealth } from '../hooks/useServiceHealth';
import { useRecentAlerts } from '../hooks/useRecentAlerts';
import { StatCard } from '../components/StatCard';
import { ServerStatusChart } from '../components/ServerStatusChart';
import { ServiceHealthBar } from '../components/ServiceHealthBar';
import { RecentAlertsTable } from '../components/RecentAlertsTable';
import { QuickActions } from '../components/QuickActions';
import { useAuth } from '../../auth/context/AuthContext';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useCallback } from 'react';

/**
 * DashboardPage component displaying overview of Harbor-Ops infrastructure
 */
export function DashboardPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: serverStatus, isLoading: serverStatusLoading } = useServerStatus();
  const { data: serviceHealth, isLoading: serviceHealthLoading } = useServiceHealth();
  const { data: alerts, isLoading: alertsLoading } = useRecentAlerts();

  const pendingReleases = alerts?.filter((a) => a.status !== 'recovered').length || 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Dashboard Overview</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Welcome back, {user?.name || 'User'}! Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end min-w-[300px]">
          <label className="flex flex-col h-12 w-full max-w-sm">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-gray-400 dark:text-gray-500 flex bg-white dark:bg-[#1C252E] items-center justify-center pl-4 rounded-l-lg border border-gray-200 dark:border-gray-700/50 border-r-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                key="dashboard-search-input"
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 text-sm font-normal leading-normal"
                placeholder="Quick lookup for servers, services..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </label>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Servers"
          value={stats?.totalServers || 0}
          change={{ value: 2.5, isPositive: true }}
          loading={statsLoading}
        />
        <StatCard
          title="Active Services"
          value={stats?.activeServices || 0}
          change={{ value: 1.2, isPositive: false }}
          loading={statsLoading}
        />
        <StatCard
          title="Credentials"
          value={stats?.totalCredentials || 0}
          loading={statsLoading}
        />
        <StatCard
          title="Tags"
          value={stats?.totalTags || 0}
          loading={statsLoading}
        />
      </div>

      {/* Pending Redeploys Card */}
      {pendingReleases > 0 && (
        <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Pending Redeploys</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You have {pendingReleases} release note{pendingReleases !== 1 ? 's' : ''} pending deployment.
              </p>
            </div>
            <Link
              to="/release-notes?status=pending"
              className="px-4 py-2 text-sm font-semibold text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              View Release Notes
            </Link>
          </div>
        </div>
      )}

      {/* Data Visualization Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ServerStatusChart
            total={serverStatus?.total || 0}
            online={serverStatus?.online || 0}
            warning={serverStatus?.warning || 0}
            offline={serverStatus?.offline || 0}
            loading={serverStatusLoading}
          />
        </div>
        <div className="lg:col-span-3">
          <ServiceHealthBar services={serviceHealth || []} loading={serviceHealthLoading} />
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentAlertsTable alerts={alerts || []} loading={alertsLoading} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

