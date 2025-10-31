import { useDashboardStats } from '../hooks/useDashboardStats';
import { useServerStatus } from '../hooks/useServerStatus';
import { useServiceHealth } from '../hooks/useServiceHealth';
import { useRecentAlerts } from '../hooks/useRecentAlerts';
import { useDashboardSearch } from '../hooks/useDashboardSearch';
import { StatCard } from '../components/StatCard';
import { ServerStatusChart } from '../components/ServerStatusChart';
import { ServiceHealthBar } from '../components/ServiceHealthBar';
import { RecentAlertsTable } from '../components/RecentAlertsTable';
import { QuickActions } from '../components/QuickActions';
import { useAuth } from '../../auth/context/AuthContext';
import { Search, Server, Cloud, Key, Globe, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { usePageTitle } from '../../../hooks/usePageTitle';

/**
 * DashboardPage component displaying overview of Harbor-Ops infrastructure
 */
export function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(e.target.value.length >= 2);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchQuery.length >= 2) {
      setShowSearchResults(true);
    }
  }, [searchQuery.length]);

  const handleSearchBlur = useCallback((e: React.FocusEvent) => {
    // Delay hiding search results to allow click events
    setTimeout(() => {
      if (!searchRef.current?.contains(e.relatedTarget as Node)) {
        setShowSearchResults(false);
      }
    }, 200);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults]);

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: serverStatus, isLoading: serverStatusLoading } = useServerStatus();
  const { data: serviceHealth, isLoading: serviceHealthLoading } = useServiceHealth();
  const { data: alerts, isLoading: alertsLoading } = useRecentAlerts();
  const { data: searchResults, isLoading: searchLoading } = useDashboardSearch(searchQuery);

  const pendingReleases = stats?.pendingReleaseNotes || 0;

  const handleSearchResultClick = useCallback((type: string, id: number) => {
    const routes: Record<string, string> = {
      server: '/servers',
      service: '/services',
      credential: '/credentials',
      domain: '/domains',
    };
    const baseRoute = routes[type] || '/';
    navigate(`${baseRoute}?${type}Id=${id}`);
    setSearchQuery('');
    setShowSearchResults(false);
  }, [navigate]);

  const allSearchResults = useMemo(() => {
    if (!searchResults) return [];
    const results: Array<{ id: number; name: string; type: string; subtitle: string | null; icon: typeof Server }> = [];
    
    const icons = {
      server: Server,
      service: Cloud,
      credential: Key,
      domain: Globe,
    };

    searchResults.servers.forEach((s) => results.push({ ...s, icon: icons.server }));
    searchResults.services.forEach((s) => results.push({ ...s, icon: icons.service }));
    searchResults.credentials.forEach((c) => results.push({ ...c, icon: icons.credential }));
    searchResults.domains.forEach((d) => results.push({ ...d, icon: icons.domain }));

    return results.slice(0, 10);
  }, [searchResults]);

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
          <div ref={searchRef} className="relative w-full max-w-sm">
            <label className="flex flex-col h-12 w-full">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full relative">
                <div className="text-gray-400 dark:text-gray-500 flex bg-white dark:bg-[#1C252E] items-center justify-center pl-4 rounded-l-lg border border-gray-200 dark:border-gray-700/50 border-r-0">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  key="dashboard-search-input"
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 text-sm font-normal leading-normal"
                  placeholder="Quick lookup for servers, services..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </label>
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Searching...
                  </div>
                ) : allSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No results found
                  </div>
                ) : (
                  <div className="py-2">
                    {allSearchResults.map((result) => {
                      const Icon = result.icon;
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSearchResultClick(result.type, result.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3"
                        >
                          <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {result.name}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                            {result.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <button
          onClick={() => navigate('/servers')}
          className="text-left hover:opacity-80 transition-opacity"
          aria-label="Navigate to servers page"
        >
          <StatCard
            title="Total Servers"
            value={stats?.totalServers || 0}
            loading={statsLoading}
          />
        </button>
        <button
          onClick={() => navigate('/services')}
          className="text-left hover:opacity-80 transition-opacity"
          aria-label="Navigate to services page"
        >
          <StatCard
            title="Active Services"
            value={stats?.activeServices || 0}
            loading={statsLoading}
          />
        </button>
        <button
          onClick={() => navigate('/credentials')}
          className="text-left hover:opacity-80 transition-opacity"
          aria-label="Navigate to credentials page"
        >
          <StatCard
            title="Credentials"
            value={stats?.totalCredentials || 0}
            loading={statsLoading}
          />
        </button>
        <button
          onClick={() => navigate('/tags')}
          className="text-left hover:opacity-80 transition-opacity"
          aria-label="Navigate to tags page"
        >
          <StatCard
            title="Tags"
            value={stats?.totalTags || 0}
            loading={statsLoading}
          />
        </button>
      </div>

      {/* Pending Release Notes Card */}
      {pendingReleases > 0 && (
        <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Pending Release Notes</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You have {pendingReleases} release note{pendingReleases !== 1 ? 's' : ''} pending deployment.
              </p>
            </div>
            <button
              onClick={() => navigate('/release-notes?status=pending')}
              className="px-4 py-2 text-sm font-semibold text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              View Release Notes
            </button>
          </div>
        </div>
      )}

      {/* Data Visualization Widgets */}
      {(serverStatus || (serviceHealth && Array.isArray(serviceHealth) && serviceHealth.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {serverStatus && (
            <div className="lg:col-span-2">
              <ServerStatusChart
                total={serverStatus.total}
                online={serverStatus.online}
                warning={serverStatus.warning}
                offline={serverStatus.offline}
                loading={serverStatusLoading}
              />
            </div>
          )}
          {serviceHealth && Array.isArray(serviceHealth) && serviceHealth.length > 0 && (
            <div className={serverStatus ? 'lg:col-span-3' : 'lg:col-span-5'}>
              <ServiceHealthBar services={serviceHealth} loading={serviceHealthLoading} />
            </div>
          )}
        </div>
      )}

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {alerts && Array.isArray(alerts) && alerts.length > 0 && (
          <div className="lg:col-span-2">
            <RecentAlertsTable alerts={alerts} loading={alertsLoading} />
          </div>
        )}
        <div className={alerts && Array.isArray(alerts) && alerts.length > 0 ? '' : 'lg:col-span-3'}>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

