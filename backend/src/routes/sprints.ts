import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth';
import * as sprintController from '../controllers/sprintController';
import { emitEntityChanged } from '../socket/socket';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Broadcast sprint changes on successful mutations
router.use((req, res, next) => {
  res.on('finish', () => {
    const isReadOnly =
      req.method === 'GET' ||
      req.path.includes('/list');
    if (!isReadOnly && res.statusCode < 400) {
      try {
        emitEntityChanged('sprint');
      } catch (err) {
        // ignore socket emission failures
      }
    }
  });
  next();
});

// Sprint CRUD
router.post('/', requirePermission('sprints:create'), sprintController.create);
router.post('/list', requirePermission('sprints:view'), sprintController.list);
router.get('/:id', requirePermission('sprints:view'), sprintController.get);
router.put('/:id', requirePermission('sprints:update'), sprintController.update);
router.delete('/:id', requirePermission('sprints:delete'), sprintController.deleteSprint);

// Sprint task management
router.post('/:id/tasks', requirePermission('sprints:update'), sprintController.addTasksToSprint);
router.delete('/:id/tasks/:taskId', requirePermission('sprints:update'), sprintController.removeTaskFromSprint);
router.post('/:id/complete', requirePermission('sprints:update'), sprintController.complete);
router.post('/:id/cancel', requirePermission('sprints:delete'), sprintController.cancel);

// Sprint analytics (role-based)
router.get('/:id/burndown', requirePermission('sprints:view-analytics'), sprintController.getBurndownData);
router.get('/:id/gantt', requirePermission('sprints:view-analytics'), sprintController.getGanttData);

export default router;
