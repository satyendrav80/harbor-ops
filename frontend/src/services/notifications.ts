import { apiFetch } from './apiClient';

export type Notification = {
  id: number;
  userId: string;
  type: string;
  taskId?: number;
  task?: {
    id: number;
    title: string;
  };
  commentId?: number;
  comment?: {
    id: number;
  };
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: Notification[];
  total: number;
};

export type UnreadCountResponse = {
  count: number;
};

/**
 * Fetch notifications
 */
export async function getNotifications(options?: {
  read?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (options?.read !== undefined) {
    params.append('read', options.read.toString());
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }
  if (options?.offset) {
    params.append('offset', options.offset.toString());
  }
  return apiFetch<NotificationsResponse>(`/notifications?${params.toString()}`);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await apiFetch<UnreadCountResponse>('/notifications/unread-count');
  return response.count;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: number): Promise<void> {
  return apiFetch<void>(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  return apiFetch<void>('/notifications/read-all', {
    method: 'PUT',
  });
}
