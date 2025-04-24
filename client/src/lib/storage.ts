import { WatchHistoryItem, SearchHistoryItem } from "./types";

// Local storage keys
const WATCH_HISTORY_KEY = 'animestream_watch_history';
const SEARCH_HISTORY_KEY = 'animestream_search_history';
const THEME_KEY = 'animestream_theme';

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

// Search History Functions
export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to get search history:', error);
    return [];
  }
}

export function saveToSearchHistory(term: string): void {
  try {
    const history = getSearchHistory();
    
    // Remove existing entry with the same term if exists
    const filteredHistory = history.filter((item) => item.term.toLowerCase() !== term.toLowerCase());
    
    // Add new entry at the beginning
    filteredHistory.unshift({
      term,
      timestamp: new Date().toISOString(),
    });
    
    // Limit history to 20 items
    const limitedHistory = filteredHistory.slice(0, 20);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Failed to save to search history:', error);
  }
}

export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

export function removeFromSearchHistory(term: string): void {
  try {
    const history = getSearchHistory();
    const updatedHistory = history.filter((item) => item.term !== term);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to remove from search history:', error);
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
