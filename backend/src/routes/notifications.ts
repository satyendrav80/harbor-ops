import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as notificationController from '../controllers/notificationController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

export default router;
