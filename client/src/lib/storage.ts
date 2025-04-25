import { WatchHistoryItem } from "./types";

// Local storage keys
const WATCH_HISTORY_KEY = 'animestream_watch_history';
const THEME_KEY = 'animestream_theme';
const WATCH_LATER_KEY = 'animestream_watch_later';

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

// Watch Later Functions
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
