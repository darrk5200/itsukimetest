import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function getRandomItemsFromArray<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];
  
  const result: T[] = [];
  const usedIndices = new Set<number>();
  
  while (result.length < count) {
    const randomIndex = Math.floor(Math.random() * array.length);
    
    if (!usedIndices.has(randomIndex)) {
      result.push(array[randomIndex]);
      usedIndices.add(randomIndex);
    }
  }
  
  return result;
}

// Get first N items from array
export function getFirstN<T>(array: T[], count: number): T[] {
  return array.slice(0, count);
}

export function getMostRecent<T extends { id: number }>(array: T[], count: number): T[] {
  // Sort by ID in descending order (highest/newest first)
  return [...array].sort((a, b) => b.id - a.id).slice(0, count);
}

// Sort animes by their latest episode addition using lastEpisodeTimestamp
export function getAnimesByLatestEpisode(animes: Array<{lastEpisodeTimestamp?: string, episodes: Array<{id: number}>}>, count: number): typeof animes {
  return [...animes].sort((a, b) => {
    // If lastEpisodeTimestamp exists, use it for sorting
    if (a.lastEpisodeTimestamp && b.lastEpisodeTimestamp) {
      return new Date(b.lastEpisodeTimestamp).getTime() - new Date(a.lastEpisodeTimestamp).getTime();
    } 
    
    // Fallback to episode IDs if timestamp is not available
    const latestEpisodeA = Math.max(...a.episodes.map(episode => episode.id));
    const latestEpisodeB = Math.max(...b.episodes.map(episode => episode.id));
    
    return latestEpisodeB - latestEpisodeA;
  }).slice(0, count);
}

// Simple debounce function for search
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Extract readable filename from URL path
export function getFilenameFromPath(path: string): string {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0].replace(/_/g, ' ').replace(/-/g, ' ');
}

/**
 * Checks if a timestamp is within the last n days, considering the GMT+6 timezone
 * 
 * @param timestamp ISO date string with timezone information
 * @param days Number of days to check
 * @returns boolean indicating if the timestamp is within the specified days
 */
export function isWithinDaysInGMT6(timestamp: string | undefined, days: number = 3): boolean {
  if (!timestamp) return false;
  
  // Parse the timestamp into a Date object
  const releaseDate = new Date(timestamp);
  
  // Get current date in user's local timezone
  const now = new Date();
  
  // Convert user's now to GMT+6
  // First, get the current user timezone offset in minutes
  const userOffsetMinutes = now.getTimezoneOffset();
  
  // GMT+6 offset is -360 minutes (negative because getTimezoneOffset returns the opposite)
  const gmt6OffsetMinutes = -360;
  
  // Calculate the difference between user timezone and GMT+6 in milliseconds
  const offsetDiffMs = (userOffsetMinutes - gmt6OffsetMinutes) * 60 * 1000;
  
  // Create a new date that represents current time in GMT+6
  const nowInGMT6 = new Date(now.getTime() + offsetDiffMs);
  
  // Calculate the difference in days
  const diffTimeMs = Math.abs(nowInGMT6.getTime() - releaseDate.getTime());
  const diffDays = Math.floor(diffTimeMs / (1000 * 60 * 60 * 24));
  
  // For a notification to appear, the episode release date should be MORE RECENT 
  // than the converted current time minus the days threshold
  const thresholdDate = new Date(nowInGMT6);
  thresholdDate.setDate(thresholdDate.getDate() - days);
  
  return releaseDate >= thresholdDate;
}
