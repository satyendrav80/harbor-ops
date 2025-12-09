import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import * as notificationService from '../services/notifications';

export async function listNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const read = req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const result = await notificationService.listNotifications(userId, {
      read,
      limit,
      offset,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
}

export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get unread count' });
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await notificationService.markAsRead(userId, notificationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    await notificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark all notifications as read' });
  }
}
