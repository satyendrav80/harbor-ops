import { apiFetch } from './apiClient';

export type DashboardStats = {
  totalServers: number;
  activeServices: number;
  totalCredentials: number;
  totalTags: number;
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
  const [servers, services, credentials, tags] = await Promise.all([
    apiFetch<Array<{ id: number }>>('/servers'),
    apiFetch<Array<{ id: number }>>('/services'),
    apiFetch<Array<{ id: number }>>('/credentials'),
    apiFetch<Array<{ id: number }>>('/tags'),
  ]);
  return {
    totalServers: servers.length,
    activeServices: services.length,
    totalCredentials: credentials.length,
    totalTags: tags.length,
  };
}

/**
 * Fetch server status counts
 */
export async function getServerStatus(): Promise<ServerStatus> {
  const servers = await apiFetch<Array<{ id: number; name: string }>>('/servers');
  // For now, simulate status - in real app, this would come from backend health checks
  const total = servers.length;
  const online = Math.floor(total * 0.8);
  const warning = Math.floor(total * 0.15);
  const offline = total - online - warning;
  return { total, online, warning, offline };
}

/**
 * Fetch service health status
 */
export async function getServiceHealth(): Promise<ServiceHealth[]> {
  const services = await apiFetch<Array<{ id: number; name: string }>>('/services');
  // Simulate health percentages - in real app, this would come from backend monitoring
  return services.map((s, i) => ({
    id: s.id,
    name: s.name,
    health: i % 4 === 0 ? 100 : i % 4 === 1 ? 100 : i % 4 === 2 ? 85 : 0,
  }));
}

/**
 * Fetch recent alerts/activity
 */
export async function getRecentAlerts(): Promise<RecentAlert[]> {
  const releaseNotes = await apiFetch<Array<{ id: number; note: string; createdAt: string; serviceId: number }>>('/release-notes?status=pending');
  const services = await apiFetch<Array<{ id: number; name: string }>>('/services');
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  
  // Create alerts from pending release notes and simulate some server alerts
  const alerts: RecentAlert[] = releaseNotes.slice(0, 4).map((rn, i) => ({
    id: rn.id,
    timestamp: getTimeAgo(new Date(rn.createdAt)),
    item: serviceMap.get(rn.serviceId) || `service-${rn.serviceId}`,
    status: i === 0 ? 'high' : i === 1 ? 'degraded' : i === 2 ? 'expiring' : 'recovered',
    action: i === 2 ? 'Renew' : 'Details',
  }));
  
  return alerts;
}

function getTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

