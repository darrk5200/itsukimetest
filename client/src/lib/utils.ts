import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
