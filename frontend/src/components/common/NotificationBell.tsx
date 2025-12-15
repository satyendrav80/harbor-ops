import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, VolumeX, Volume2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, type Notification } from '../../services/notifications';
import { getSocket } from '../../services/socket';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import tonesUrl from '../../assets/tones.mp3?url';
// Format date relative to now
const formatRelativeTime = (date: string) => {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return notificationDate.toLocaleDateString();
  }
};

type NotificationBellProps = {
  onTaskClick?: (taskId: number) => void;
  onReleaseNoteClick?: (releaseNoteId: number) => void;
};

export function NotificationBell({ onTaskClick, onReleaseNoteClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch notifications when dropdown is open
  const PAGE_SIZE = 20;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [allowSound, setAllowSound] = useState<boolean>(() => {
    const stored = localStorage.getItem('notifySoundEnabled');
    return stored === null ? true : stored === 'true';
  });
  const [soundChoice, setSoundChoice] = useState<'default' | 'none'>(() => {
    const storedChoice = localStorage.getItem('notifySoundChoice');
    if (storedChoice === 'none' || storedChoice === 'default') return storedChoice;
    return allowSound ? 'default' : 'none';
  });

  const loadNotifications = useCallback(
    async ({ reset = false } = {}) => {
      const nextOffset = reset ? 0 : offset;
      setIsLoadingMore(true);
      const res = await getNotifications({ limit: PAGE_SIZE, offset: nextOffset });
      setNotifications((prev) => (reset ? res.notifications : [...prev, ...res.notifications]));
      const newOffset = nextOffset + res.notifications.length;
      setOffset(newOffset);
      setHasMore(newOffset < res.total);
      setIsLoadingMore(false);
    },
    [offset]
  );

  // Listen for new notifications via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      // Prepend and keep offset consistent by resetting
      loadNotifications({ reset: true });
      // Fire desktop notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(notification.title, {
          body: notification.message,
          tag: `notif-${notification.id}-${Date.now()}`,
        });
        n.onclick = () => {
          window.focus();
          if (notification.taskId) {
            if (onTaskClick) {
              onTaskClick(notification.taskId);
            }
          } else if (notification.releaseNoteId) {
            if (onReleaseNoteClick) {
              onReleaseNoteClick(notification.releaseNoteId);
            } else {
              navigate(`/release-notes?releaseNoteId=${notification.releaseNoteId}`);
            }
          }
        };
      }
      // Play sound if allowed and user has interacted
      const canPlay = allowSound && soundChoice !== 'none';
      if (canPlay && hasUserInteracted) {
        if (!audioRef.current) {
          const audio = new Audio(tonesUrl);
          audio.volume = 0.6;
          audioRef.current = audio;
        }
        audioRef.current!.currentTime = 0;
        audioRef.current!
          .play()
          .catch(() => {
            toast.error('Unable to play notification sound (browser blocked autoplay).');
          });
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [queryClient, loadNotifications, allowSound, soundChoice, hasUserInteracted, onTaskClick, onReleaseNoteClick, navigate]);

  // Listen to storage changes for sound toggle (so profile changes reflect here)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'notifySoundEnabled' && e.newValue !== null) {
        setAllowSound(e.newValue === 'true');
      }
      if (e.key === 'notifySoundChoice' && e.newValue) {
        if (e.newValue === 'none' || e.newValue === 'default') {
          setSoundChoice(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Session-level prompt to enable desktop notifications if permission was reset to default
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const alreadyPrompted = sessionStorage.getItem('notifPromptShown');
    if (alreadyPrompted) return;
    if (Notification.permission === 'default') {
      const tId = toast((t) => (
        <div className="text-sm text-gray-900 dark:text-gray-100">
          Enable desktop notifications?
          <div className="mt-2 flex gap-2">
            <button
              className="px-3 py-1 text-xs font-medium bg-primary text-white rounded"
              onClick={async () => {
                const perm = await Notification.requestPermission();
                setNotifPermission(perm);
                toast.dismiss(t.id);
                sessionStorage.setItem('notifPromptShown', 'true');
              }}
            >
              Allow
            </button>
            <button
              className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded"
              onClick={() => {
                toast.dismiss(t.id);
                sessionStorage.setItem('notifPromptShown', 'true');
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      ), { duration: 8000 });
    } else {
      sessionStorage.setItem('notifPromptShown', 'true');
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      // Update local list
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
    }

    setIsOpen(false);

    // Navigate to task if available
    if (notification.taskId) {
      if (onTaskClick) {
        onTaskClick(notification.taskId);
      } else {
        navigate(`/tasks/${notification.taskId}`);
      }
    }
    
    // Navigate to release note if available
    if (notification.releaseNoteId) {
      if (onReleaseNoteClick) {
        onReleaseNoteClick(notification.releaseNoteId);
      } else {
        navigate(`/release-notes?releaseNoteId=${notification.releaseNoteId}`);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setHasUserInteracted(true);
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          // Prompt for notification permission when opening if still default
          if (!isOpen && typeof Notification !== 'undefined' && notifPermission === 'default') {
            Notification.requestPermission().then((perm) => setNotifPermission(perm));
          }
          if (!isOpen) {
            loadNotifications({ reset: true });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
          }
        }}
        className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-lg z-50 max-h-[600px] flex flex-col">
          {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <button
                  onClick={() => {
          setAllowSound((prev) => {
            const next = !prev;
            localStorage.setItem('notifySoundEnabled', String(next));
            return next;
          });
                  }}
                  className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title={allowSound ? 'Mute notification sound' : 'Unmute notification sound'}
                >
                  {allowSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                {typeof Notification !== 'undefined' && notifPermission === 'default' && (
                  <button
                    onClick={async () => {
                      const perm = await Notification.requestPermission();
                      setNotifPermission(perm);
                    }}
                    className="text-xs text-primary hover:text-primary/80 underline"
                  >
                    Enable desktop alerts
                  </button>
                )}
              </div>
              {unreadNotifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all as read
                </button>
              )}
            </div>

          {/* Notifications List */}
          <div
            className="overflow-y-auto flex-1"
            onScroll={(e) => {
              const target = e.currentTarget;
              if (
                hasMore &&
                !isLoadingMore &&
                target.scrollTop + target.clientHeight >= target.scrollHeight - 50
              ) {
                loadNotifications();
              }
            }}
          >
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-1 min-w-0 ${notification.read ? 'opacity-75' : ''}`}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {isLoadingMore && (
              <div className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">Loading...</div>
            )}
            {!hasMore && notifications.length > 0 && (
              <div className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">No more notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
