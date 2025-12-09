import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth';
import * as taskController from '../controllers/taskController';
import * as taskCommentController from '../controllers/taskCommentController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Filter metadata (must be before /:id route)
router.get('/filter-metadata', requirePermission('tasks:view'), taskController.getMetadata);

// Task CRUD
router.post('/', requirePermission('tasks:create'), taskController.create);
router.post('/list', requirePermission('tasks:view'), taskController.list);
router.get('/:id', requirePermission('tasks:view'), taskController.get);
router.put('/:id', requirePermission('tasks:update'), taskController.update);
router.delete('/:id', requirePermission('tasks:delete'), taskController.deleteTask);

// Task workflow
router.patch('/:id/status', requirePermission('tasks:update'), taskController.updateStatus);
router.patch('/:id/reopen', requirePermission('tasks:update'), taskController.reopen);

// Dependencies
router.post('/:id/dependencies', requirePermission('tasks:manage-dependencies'), taskController.addDependency);
router.delete('/:id/dependencies/:dependencyId', requirePermission('tasks:manage-dependencies'), taskController.removeDependency);

// Subtasks
router.post('/:id/subtasks', requirePermission('tasks:create'), taskController.createSubtask);
router.get('/:id/subtasks', requirePermission('tasks:view'), taskController.getSubtasks);

// Comments
router.post('/:id/comments', requirePermission('tasks:comment'), taskCommentController.create);
router.put('/:id/comments/:commentId', requirePermission('tasks:comment'), taskCommentController.update);
router.delete('/:id/comments/:commentId', requirePermission('tasks:comment'), taskCommentController.deleteComment);

// Reactions
router.post('/:id/comments/:commentId/reactions', requirePermission('tasks:comment'), taskCommentController.addReaction);
router.delete('/:id/comments/:commentId/reactions/:emoji', requirePermission('tasks:comment'), taskCommentController.removeReaction);

export default router;
