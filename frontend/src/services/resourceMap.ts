import { apiFetch } from './apiClient';

export type ResourceMapData = {
  servers: Array<{
    id: number;
    name: string;
    type: string;
    services: Array<{
      id: number;
      name: string;
      port: number;
    }>;
    credentials: Array<{
      credential: {
        id: number;
        name: string;
        type: string;
      };
    }>;
    domains: Array<{
      domain: {
        id: number;
        name: string;
      };
    }>;
    tags: Array<{
      tag: {
        id: number;
        name: string;
        value: string | null;
      };
    }>;
  }>;
  services: Array<{
    id: number;
    name: string;
    port: number;
    server: {
      id: number;
      name: string;
      type: string;
    };
    credentials: Array<{
      credential: {
        id: number;
        name: string;
        type: string;
      };
    }>;
    domains: Array<{
      domain: {
        id: number;
        name: string;
      };
    }>;
    dependencies: Array<{
      id: number;
      dependencyServiceId: number | null;
      dependencyService: {
        id: number;
        name: string;
        port: number;
      } | null;
      externalServiceName: string | null;
      externalServiceType: string | null;
      externalServiceUrl: string | null;
    }>;
    tags: Array<{
      tag: {
        id: number;
        name: string;
        value: string | null;
      };
    }>;
  }>;
  credentials: Array<{
    id: number;
    name: string;
    type: string;
    servers: Array<{
      server: {
        id: number;
        name: string;
        type: string;
      };
    }>;
    services: Array<{
      service: {
        id: number;
        name: string;
        port: number;
      };
    }>;
  }>;
  domains: Array<{
    id: number;
    name: string;
    servers: Array<{
      server: {
        id: number;
        name: string;
        type: string;
      };
    }>;
    services: Array<{
      service: {
        id: number;
        name: string;
        port: number;
      };
    }>;
  }>;
};

/**
 * Fetch resource map data with all relationships
 */
export async function getResourceMap(): Promise<ResourceMapData> {
  return apiFetch<ResourceMapData>('/resource-map');
}

