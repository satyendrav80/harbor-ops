import { Router } from 'express';
import { SERVER_TYPES, SERVER_TYPE_LABELS } from '../constants/serverTypes';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../constants/permissions';

const router = Router();

// Public constants endpoint (accessible without auth for initial load)
router.get('/', async (_req, res) => {
  res.json({
    serverTypes: SERVER_TYPES,
    serverTypeLabels: SERVER_TYPE_LABELS,
    permissionResources: PERMISSION_RESOURCES,
    permissionActions: PERMISSION_ACTIONS,
  });
});

export default router;

