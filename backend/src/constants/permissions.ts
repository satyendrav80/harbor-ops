export const PERMISSION_RESOURCES = [
  'users',
  'roles',
  'permissions',
  'credentials',
  'servers',
  'services',
  'groups',
  'tags',
  'release-notes',
  'domains',
  'dashboard',
  'profile',
  'tasks',
  'sprints',
] as const;

// Generic/default actions that apply to all resources
export const PERMISSION_ACTIONS_GENERIC = [
  'view',
  'create',
  'update',
  'delete',
  'manage',
] as const;

// Resource-specific actions - actions that only apply to certain resources
export const PERMISSION_ACTIONS_RESOURCE_SPECIFIC: Record<string, readonly string[]> = {
  'credentials': ['reveal'],
  'release-notes': ['deploy'],
  'tasks': ['assign', 'comment', 'manage-dependencies', 'override-dependencies'],
  'sprints': ['view-analytics'],
} as const;

/**
 * Get all valid actions for a specific resource
 * Includes both generic actions and resource-specific actions
 * Returns a mutable array for easier use
 */
export function getActionsForResource(resource: string): string[] {
  const genericActions = Array.from(PERMISSION_ACTIONS_GENERIC);
  const resourceSpecificActions = PERMISSION_ACTIONS_RESOURCE_SPECIFIC[resource] || [];
  return [...genericActions, ...Array.from(resourceSpecificActions)];
}

/**
 * Get all possible actions across all resources
 * Used for backwards compatibility and general listing
 * Returns a mutable array for compatibility with existing code
 */
export function getAllPermissionActions(): string[] {
  const genericActions = Array.from(PERMISSION_ACTIONS_GENERIC);
  const resourceSpecificActions = Object.values(PERMISSION_ACTIONS_RESOURCE_SPECIFIC)
    .flat()
    .filter((action, index, array) => array.indexOf(action) === index); // Remove duplicates

  return [...genericActions, ...resourceSpecificActions];
}

/**
 * Check if an action is valid for a specific resource
 */
export function isValidActionForResource(resource: string, action: string): boolean {
  const validActions = getActionsForResource(resource);
  return validActions.includes(action);
}

/**
 * Check if a permission is a system permission (valid resource + valid action for that resource)
 */
export function isSystemPermission(resource: string, action: string): boolean {
  const isValidResource = (PERMISSION_RESOURCES as readonly string[]).includes(resource);
  if (!isValidResource) return false;

  return isValidActionForResource(resource, action);
}

// Backwards compatibility - exports all possible actions
// This is used in constants endpoint and other places that need a flat list
export const PERMISSION_ACTIONS = getAllPermissionActions();


