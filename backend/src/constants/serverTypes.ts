/**
 * Server types that are available in the system
 */
export const SERVER_TYPES = ['os', 'rds', 'amplify', 'lambda', 'ec2', 'ecs', 'other'] as const;

export type ServerType = typeof SERVER_TYPES[number];

/**
 * Server type display names
 */
export const SERVER_TYPE_LABELS: Record<ServerType, string> = {
  os: 'OS (Operating System)',
  rds: 'RDS',
  amplify: 'Amplify',
  lambda: 'Lambda',
  ec2: 'EC2',
  ecs: 'ECS',
  other: 'Other',
};

/**
 * Check if a string is a valid server type
 */
export function isValidServerType(type: string): type is ServerType {
  return (SERVER_TYPES as readonly string[]).includes(type);
}

