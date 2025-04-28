import { WatchHistoryItem, Notification, Comment } from "./types";

// Local storage keys
const WATCH_HISTORY_KEY = 'itsukime_watch_history';
const THEME_KEY = 'itsukime_theme';
const WATCH_LATER_KEY = 'itsukime_watch_later';
const NOTIFY_KEY = 'itsukime_notify';
const NOTIFICATIONS_KEY = 'itsukime_notifications';
const COMMENTS_KEY = 'itsukime_comments';
const USER_NAME_KEY = 'itsukime_user_name';
const USER_AVATAR_KEY = 'itsukime_user_avatar';
const LAST_COMMENT_TIME_KEY = 'itsukime_last_comment_time';

// Watch History Functions
export function getWatchHistory(): WatchHistoryItem[] {
  try {
    const history = localStorage.getItem(WATCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to get watch history:', error);
    return [];
  }
}

export function saveToWatchHistory(item: WatchHistoryItem): void {
  try {
    const history = getWatchHistory();
    
    // Check if this anime+episode already exists in history
    const existingIndex = history.findIndex(
      (historyItem) => 
        historyItem.animeId === item.animeId && 
        historyItem.episodeId === item.episodeId
    );
    
    if (existingIndex !== -1) {
      // Update existing entry
      history[existingIndex] = {
        ...history[existingIndex],
        ...item,
        lastWatched: new Date().toISOString(),
      };
    } else {
      // Add new entry
      history.unshift({
        ...item,
        lastWatched: new Date().toISOString(),
      });
    }
    
    // Limit history to 100 items
    const limitedHistory = history.slice(0, 100);
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Failed to save to watch history:', error);
  }
}

export function clearWatchHistory(): void {
  localStorage.removeItem(WATCH_HISTORY_KEY);
}

export function removeFromWatchHistory(animeId: number, episodeId: number): void {
  try {
    const history = getWatchHistory();
    const updatedHistory = history.filter(
      (item) => !(item.animeId === animeId && item.episodeId === episodeId)
    );
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to remove from watch history:', error);
  }
}

// Theme
export function getTheme(): 'dark' | 'light' {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' ? 'light' : 'dark';
  } catch (error) {
    console.error('Failed to get theme:', error);
    return 'dark';
  }
}

export function setTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.error('Failed to set theme:', error);
  }
}

// Bookmarks Functions
export function getWatchLaterList(): number[] {
  try {
    const watchLater = localStorage.getItem(WATCH_LATER_KEY);
    return watchLater ? JSON.parse(watchLater) : [];
  } catch (error) {
    console.error('Failed to get watch later list:', error);
    return [];
  }
}

export function addToWatchLater(animeId: number): void {
  try {
    const watchLater = getWatchLaterList();
    if (!watchLater.includes(animeId)) {
      watchLater.push(animeId);
      localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(watchLater));
    }
  } catch (error) {
    console.error('Failed to add to watch later:', error);
  }
}

export function removeFromWatchLater(animeId: number): void {
  try {
    const watchLater = getWatchLaterList();
    const updatedList = watchLater.filter(id => id !== animeId);
    localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(updatedList));
  } catch (error) {
    console.error('Failed to remove from watch later:', error);
  }
}

export function toggleWatchLater(animeId: number): boolean {
  try {
    const watchLater = getWatchLaterList();
    const isInList = watchLater.includes(animeId);
    
    if (isInList) {
      removeFromWatchLater(animeId);
      return false;
    } else {
      addToWatchLater(animeId);
      return true;
    }
  } catch (error) {
    console.error('Failed to toggle watch later:', error);
    return false;
  }
}

export function isInWatchLater(animeId: number): boolean {
  try {
    const watchLater = getWatchLaterList();
    return watchLater.includes(animeId);
  } catch (error) {
    console.error('Failed to check if in watch later:', error);
    return false;
  }
}

// Notify Functions - for tracking anime with notifications enabled
export function getNotifyList(): number[] {
  try {
    const notifyList = localStorage.getItem(NOTIFY_KEY);
    return notifyList ? JSON.parse(notifyList) : [];
  } catch (error) {
    console.error('Failed to get notify list:', error);
    return [];
  }
}

export function addToNotify(animeId: number): void {
  try {
    const notifyList = getNotifyList();
    if (!notifyList.includes(animeId)) {
      notifyList.push(animeId);
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(notifyList));
    }
  } catch (error) {
    console.error('Failed to add to notify list:', error);
  }
}

export function removeFromNotify(animeId: number): void {
  try {
    const notifyList = getNotifyList();
    const updatedList = notifyList.filter(id => id !== animeId);
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(updatedList));
  } catch (error) {
    console.error('Failed to remove from notify list:', error);
  }
}

export function toggleNotify(animeId: number): boolean {
  try {
    const notifyList = getNotifyList();
    const isInList = notifyList.includes(animeId);
    
    if (isInList) {
      removeFromNotify(animeId);
      return false;
    } else {
      addToNotify(animeId);
      return true;
    }
  } catch (error) {
    console.error('Failed to toggle notify:', error);
    return false;
  }
}

export function isInNotify(animeId: number): boolean {
  try {
    const notifyList = getNotifyList();
    return notifyList.includes(animeId);
  } catch (error) {
    console.error('Failed to check if in notify list:', error);
    return false;
  }
}

// Notifications Functions
export function getNotifications(): Notification[] {
  try {
    const notifications = localStorage.getItem(NOTIFICATIONS_KEY);
    return notifications ? JSON.parse(notifications) : [];
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
}

export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
  try {
    const notifications = getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    };
    
    notifications.unshift(newNotification);
    // Limit to 50 notifications
    const limitedNotifications = notifications.slice(0, 50);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limitedNotifications));
  } catch (error) {
    console.error('Failed to add notification:', error);
  }
}

export function markNotificationAsRead(notificationId: string): void {
  try {
    const notifications = getNotifications();
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true } 
        : notification
    );
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

export function markAllNotificationsAsRead(): void {
  try {
    const notifications = getNotifications();
    const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
}

export function getUnreadNotificationsCount(): number {
  try {
    const notifications = getNotifications();
    return notifications.filter(notification => !notification.read).length;
  } catch (error) {
    console.error('Failed to get unread notifications count:', error);
    return 0;
  }
}

export function clearAllNotifications(): void {
  try {
    localStorage.removeItem(NOTIFICATIONS_KEY);
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
}

// User Profile Functions
export function getUserName(): string {
  try {
    const userName = localStorage.getItem(USER_NAME_KEY);
    return userName || '';
  } catch (error) {
    console.error('Failed to get user name:', error);
    return '';
  }
}

export function setUserName(userName: string): void {
  try {
    localStorage.setItem(USER_NAME_KEY, userName);
  } catch (error) {
    console.error('Failed to set user name:', error);
  }
}

export function getUserAvatar(): string {
  try {
    const avatar = localStorage.getItem(USER_AVATAR_KEY);
    return avatar || 'icon_01'; // Default avatar
  } catch (error) {
    console.error('Failed to get user avatar:', error);
    return 'icon_01';
  }
}

export function setUserAvatar(avatarName: string): void {
  try {
    localStorage.setItem(USER_AVATAR_KEY, avatarName);
  } catch (error) {
    console.error('Failed to set user avatar:', error);
  }
}

export function getComments(): Comment[] {
  try {
    const comments = localStorage.getItem(COMMENTS_KEY);
    return comments ? JSON.parse(comments) : [];
  } catch (error) {
    console.error('Failed to get comments:', error);
    return [];
  }
}

export function getCommentsByEpisode(animeId: number, episodeId: number): Comment[] {
  try {
    const comments = getComments();
    return comments.filter(comment => 
      comment.animeId === animeId && comment.episodeId === episodeId
    );
  } catch (error) {
    console.error('Failed to get comments by episode:', error);
    return [];
  }
}

// Comment cooldown functions (5 minutes between comments)
export function getLastCommentTime(): Date | null {
  try {
    const lastTimeStr = localStorage.getItem(LAST_COMMENT_TIME_KEY);
    return lastTimeStr ? new Date(lastTimeStr) : null;
  } catch (error) {
    console.error('Failed to get last comment time:', error);
    return null;
  }
}

export function updateLastCommentTime(): void {
  try {
    localStorage.setItem(LAST_COMMENT_TIME_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Failed to update last comment time:', error);
  }
}

export function canComment(): { allowed: boolean; remainingSeconds: number } {
  const lastCommentTime = getLastCommentTime();
  
  if (!lastCommentTime) {
    return { allowed: true, remainingSeconds: 0 };
  }
  
  const now = new Date();
  const diffMs = now.getTime() - lastCommentTime.getTime();
  const cooldownMs = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  if (diffMs >= cooldownMs) {
    return { allowed: true, remainingSeconds: 0 };
  }
  
  // Calculate remaining seconds in cooldown
  const remainingSeconds = Math.ceil((cooldownMs - diffMs) / 1000);
  return { allowed: false, remainingSeconds };
}

export function addComment(comment: Omit<Comment, 'id' | 'timestamp' | 'likes'>): Comment {
  try {
    const comments = getComments();
    
    const newComment: Comment = {
      ...comment,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      likes: 0
    };
    
    comments.push(newComment);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    
    // Update the last comment time
    updateLastCommentTime();
    
    return newComment;
  } catch (error) {
    console.error('Failed to add comment:', error);
    // Return a default comment in case of error
    return {
      id: 'error',
      animeId: comment.animeId,
      episodeId: comment.episodeId,
      userName: comment.userName,
      text: comment.text,
      timestamp: new Date().toISOString(),
      likes: 0
    };
  }
}

export function likeComment(commentId: string): void {
  try {
    const comments = getComments();
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex !== -1) {
      comments[commentIndex].likes += 1;
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    }
  } catch (error) {
    console.error('Failed to like comment:', error);
  }
}

export function deleteComment(commentId: string): void {
  try {
    const comments = getComments();
    const filteredComments = comments.filter(c => c.id !== commentId);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(filteredComments));
  } catch (error) {
    console.error('Failed to delete comment:', error);
  }
}
