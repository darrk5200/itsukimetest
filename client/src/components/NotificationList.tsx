import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Bell, X, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications
} from '@/lib/storage';
import { Notification } from '@/lib/types';

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  // Load notifications when the component mounts or when the popover opens
  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  // Check for unread notifications periodically (every 30 seconds)
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const notifs = getNotifications();
    setNotifications(notifs);
    loadUnreadCount();
  };

  const loadUnreadCount = () => {
    setUnreadCount(getUnreadNotificationsCount());
  };

  const handleNotificationClick = (notificationId: string) => {
    markNotificationAsRead(notificationId);
    loadNotifications();
    setOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleClearAll = () => {
    clearAllNotifications();
    loadNotifications();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-1">
            {notifications.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleClearAll}
                  title="Clear all notifications"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link 
                  key={notification.id} 
                  href={notification.episodeId 
                    ? `/anime/${notification.animeId}/episode/${notification.episodeId}` 
                    : `/anime/${notification.animeId}`
                  }
                >
                  <div 
                    className={`p-3 hover:bg-muted cursor-pointer ${notification.read ? 'opacity-70' : ''}`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{notification.animeName}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5">{notification.message}</p>
                    {!notification.read && (
                      <div className="mt-1 h-2 w-2 bg-primary rounded-full" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}