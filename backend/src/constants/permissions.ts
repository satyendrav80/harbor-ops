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
  'dashboard',
  'profile',
] as const;

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'manage',
] as const;

export function isSystemPermission(resource: string, action: string): boolean {
  return (PERMISSION_RESOURCES as readonly string[]).includes(resource) &&
         (PERMISSION_ACTIONS as readonly string[]).includes(action);
}


