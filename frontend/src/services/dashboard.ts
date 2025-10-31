import { apiFetch } from './apiClient';

export type DashboardStats = {
  totalServers: number;
  activeServices: number;
  totalCredentials: number;
  totalTags: number;
  pendingReleaseNotes: number;
};

export type ServerStatus = {
  total: number;
  online: number;
  warning: number;
  offline: number;
};

export type ServiceHealth = {
  id: number;
  name: string;
  health: number; // 0-100 percentage
};

export type RecentAlert = {
  id: number;
  timestamp: string;
  item: string;
  status: 'high' | 'degraded' | 'expiring' | 'recovered';
  action?: string;
};

/**
 * Fetch dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/dashboard/stats');
}

/**
 * Fetch server status counts
 */
export async function getServerStatus(): Promise<ServerStatus> {
  return apiFetch<ServerStatus>('/dashboard/server-status');
}

/**
 * Fetch service health status
 */
export async function getServiceHealth(): Promise<ServiceHealth[]> {
  return apiFetch<ServiceHealth[]>('/dashboard/service-health');
}

/**
 * Fetch recent alerts/activity
 */
export async function getRecentAlerts(): Promise<RecentAlert[]> {
  return apiFetch<RecentAlert[]>('/dashboard/recent-alerts');
}

/**
 * Search across servers, services, credentials, and domains
 */
export type SearchResult = {
  id: number;
  name: string;
  type: 'server' | 'service' | 'credential' | 'domain';
  subtitle: string | null;
};

export type SearchResults = {
  servers: SearchResult[];
  services: SearchResult[];
  credentials: SearchResult[];
  domains: SearchResult[];
};

export async function searchDashboard(query: string, limit?: number): Promise<SearchResults> {
  const params = new URLSearchParams({ q: query });
  if (limit) {
    params.append('limit', limit.toString());
  }
  return apiFetch<SearchResults>(`/dashboard/search?${params.toString()}`);
}

