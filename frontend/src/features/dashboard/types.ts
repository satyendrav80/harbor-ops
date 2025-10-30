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

