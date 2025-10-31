import { apiFetch } from './apiClient';

// ServerType is inferred from backend constants
export type ServerType = string;

export type Constants = {
  serverTypes: readonly string[];
  serverTypeLabels: Record<string, string>;
  permissionResources: readonly string[];
  permissionActions: readonly string[];
};

let cachedConstants: Constants | null = null;

/**
 * Fetch constants from the backend (cached after first load)
 */
export async function getConstants(): Promise<Constants> {
  if (cachedConstants) {
    return cachedConstants;
  }
  
  // Constants endpoint doesn't require auth, so we can fetch it directly
  cachedConstants = await apiFetch<Constants>('/constants');
  return cachedConstants;
}

/**
 * Clear cached constants (useful for testing or when constants might change)
 */
export function clearConstantsCache() {
  cachedConstants = null;
}

