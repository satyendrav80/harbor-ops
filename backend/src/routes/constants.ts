import { Router } from 'express';
import { SERVER_TYPES, SERVER_TYPE_LABELS } from '../constants/serverTypes';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS, PERMISSION_ACTIONS_GENERIC, PERMISSION_ACTIONS_RESOURCE_SPECIFIC, getActionsForResource } from '../constants/permissions';

const router = Router();

// Public constants endpoint (accessible without auth for initial load)
router.get('/', async (_req, res) => {
  // Build resource-specific actions map for frontend
  const resourceActions: Record<string, string[]> = {};
  for (const resource of PERMISSION_RESOURCES) {
    resourceActions[resource] = getActionsForResource(resource);
  }

  res.json({
    serverTypes: SERVER_TYPES,
    serverTypeLabels: SERVER_TYPE_LABELS,
    permissionResources: PERMISSION_RESOURCES,
    permissionActions: PERMISSION_ACTIONS, // All possible actions (for backwards compatibility)
    permissionActionsGeneric: Array.from(PERMISSION_ACTIONS_GENERIC), // Generic actions
    permissionActionsResourceSpecific: PERMISSION_ACTIONS_RESOURCE_SPECIFIC, // Resource-specific actions map
    permissionResourceActions: resourceActions, // Map of resource -> [actions] for easy lookup
  });
});

export default router;

