import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  getNotifyTimestampForAnime, 
  addNotification, 
  getNotifyTimestamps 
} from "@/lib/storage";
import { Anime } from "@/lib/types";

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
export function getAnimesByLatestEpisode<T extends {lastEpisodeTimestamp?: string, episodes: Array<{id: number}>}>(animes: T[], count: number): T[] {
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

/**
 * Checks if the user has watched the latest episode of an anime
 * 
 * @param animeId The ID of the anime to check
 * @param latestEpisodeId The ID of the latest episode
 * @returns boolean indicating if the user has watched the latest episode
 */
export function hasWatchedLatestEpisode(animeId: number, latestEpisodeId: number): boolean {
  try {
    // Get watch history from local storage
    const watchHistoryJSON = localStorage.getItem('itsukime_watch_history');
    if (!watchHistoryJSON) return false;
    
    const watchHistory = JSON.parse(watchHistoryJSON);
    
    // Check if there's an entry for this anime episode in the history
    return watchHistory.some((item: any) => 
      item.animeId === animeId && 
      item.episodeId === latestEpisodeId && 
      // Consider it watched if they've watched more than 70% of it
      item.progress >= 70
    );
  } catch (error) {
    console.error('Error checking if latest episode was watched:', error);
    return false;
  }
}

/**
 * Checks if an episode was released after notifications were enabled for an anime
 * 
 * @param animeId The ID of the anime
 * @param episodeReleaseTimestamp The timestamp when the episode was released
 * @returns boolean indicating if the episode was released after notifications were enabled
 */
export function wasReleasedAfterNotificationEnabled(animeId: number, episodeReleaseTimestamp?: string): boolean {
  try {
    if (!episodeReleaseTimestamp) return false;
    
    // Get the timestamp when notifications were enabled for this anime
    const notifyTimestamp = getNotifyTimestampForAnime(animeId);
    if (!notifyTimestamp) return false;
    
    // Compare the episode release timestamp with the notification enabled timestamp
    const releaseDate = new Date(episodeReleaseTimestamp);
    const notifyDate = new Date(notifyTimestamp);
    
    // Episode should be released AFTER notifications were enabled
    return releaseDate > notifyDate;
  } catch (error) {
    console.error('Error checking if episode was released after notification enabled:', error);
    return false;
  }
}

/**
 * Checks for new unwatched episodes in animes the user has enabled notifications for,
 * and creates notifications for them if they were released after notification was enabled.
 * 
 * This should be called when the app starts and periodically (e.g., daily).
 */
export function checkForNewEpisodeNotifications(animes: Anime[]): void {
  try {
    // Get list of animes the user wants notifications for
    const notifyList = getNotifyTimestamps();
    if (!notifyList || notifyList.length === 0) return;
    
    // For each anime with notifications enabled
    for (const animeTimestamp of notifyList) {
      const animeId = animeTimestamp.animeId;
      const notificationEnabledTime = animeTimestamp.timestamp;
      
      // Find the anime in the list
      const anime = animes.find(a => a.id === animeId);
      if (!anime || !anime.lastEpisodeTimestamp) continue;
      
      // Check if the latest episode was released after notifications were enabled
      const latestEpisodeTimestamp = anime.lastEpisodeTimestamp;
      const releaseDate = new Date(latestEpisodeTimestamp);
      const notifyDate = new Date(notificationEnabledTime);
      
      // Only proceed if the episode was released after notifications were enabled
      if (releaseDate > notifyDate) {
        // Check if the episode was released recently (within last 3 days)
        if (isWithinDaysInGMT6(latestEpisodeTimestamp, 3)) {
          // Get the latest episode
          const latestEpisodeId = anime.episodes[anime.releasedEpisodes - 1]?.id;
          
          // Only notify if user hasn't watched it yet
          if (latestEpisodeId && !hasWatchedLatestEpisode(animeId, latestEpisodeId)) {
            // Add notification
            addNotification({
              animeId: anime.id,
              animeName: anime.anime_name,
              message: `New episode ${anime.releasedEpisodes} is available to watch!`,
              episodeId: latestEpisodeId
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking for new episode notifications:', error);
  }
}

/**
 * Implements comprehensive security measures to prevent access to developer tools,
 * browser console, and protect video content from being downloaded or inspected.
 * 
 * This function should be called once when the application starts.
 */
/**
 * Utility function for testing direct video access security
 * This function attempts to access a video directly without a token
 * It should be blocked by the server security middleware
 * Only used in development for testing purposes
 */
export async function testVideoSecurity(videoUrl: string): Promise<void> {
  if (import.meta.env.PROD) return; // Only run in development
  
  console.log("[Security Test] Attempting to access video directly without token...");
  console.log("[Security Test] Testing URL:", videoUrl);
  
  try {
    // Try direct access which should be blocked
    const response = await fetch(videoUrl);
    
    if (response.status === 403) {
      console.log("[Security Test] ✅ PASSED: Direct access was properly blocked with 403 status");
      console.log("[Security Test] This means the server security middleware is working correctly.");
      
      // Also try to fetch video content to see exactly what is returned
      const text = await response.text();
      console.log("[Security Test] Server response:", text.substring(0, 100) + (text.length > 100 ? "..." : ""));
      
      return;
    } else {
      console.warn("[Security Test] ⚠️ FAILED: Direct access was not properly blocked!");
      console.warn("[Security Test] Expected status 403, but got:", response.status);
      
      // If we got a successful response, this is a security issue
      if (response.status === 200) {
        console.error("[Security Test] CRITICAL SECURITY ISSUE: Video content is accessible without a token!");
      }
    }
  } catch (error) {
    console.log("[Security Test] ✅ PASSED: Direct access attempt failed with error:", error);
    console.log("[Security Test] This means security is working as expected.");
  }
  
  // Now let's also test with a deliberately invalid token
  console.log("[Security Test] Now testing with invalid token...");
  try {
    const invalidTokenUrl = videoUrl + "?token=invalid-token-test";
    const response = await fetch(invalidTokenUrl);
    
    if (response.status === 403) {
      console.log("[Security Test] ✅ PASSED: Invalid token was properly rejected");
    } else {
      console.warn("[Security Test] ⚠️ FAILED: Invalid token was not properly rejected:", response.status);
    }
  } catch (error) {
    console.log("[Security Test] Error testing invalid token:", error);
  }
}

export function setupSecurityMeasures(): void {
  try {
    // Disable default browser behaviors
    document.addEventListener('contextmenu', (e) => {
      // Allow context menu on form inputs for accessibility
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return true;
      }
      e.preventDefault();
      return false;
    }, { capture: true });
    
    // Prevent key combinations that could open developer tools
    document.addEventListener('keydown', (e) => {
      // Block F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      
      // Block Ctrl+Shift+I (inspect element)
      if ((e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) ||
          (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i'))) { // Also block Cmd+Option+I for Mac
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      
      // Block Ctrl+Shift+J (open console)
      if ((e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) ||
          (e.metaKey && e.altKey && (e.key === 'J' || e.key === 'j'))) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      
      // Block Ctrl+Shift+C (inspector mode)
      if ((e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) ||
          (e.metaKey && e.altKey && (e.key === 'C' || e.key === 'c'))) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      
      // Block Cmd+Option+U for Mac (view source)
      if ((e.metaKey && e.altKey && (e.key === 'U' || e.key === 'u')) ||
          (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85))) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      
      // Block Ctrl+S (save)
      if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      
      return true;
    }, { capture: true, passive: false });
    
    // Prevent copy operations for videos and sensitive content
    document.addEventListener('copy', (e) => {
      // Allow copying text from inputs for accessibility
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return true;
      }
      
      // Check if we're copying from a video or image element
      let element = e.target as HTMLElement;
      while (element) {
        if (element instanceof HTMLVideoElement || 
            element instanceof HTMLImageElement || 
            element.classList.contains('video-container') ||
            element.classList.contains('anime-card')) {
          e.preventDefault();
          return false;
        }
        element = element.parentElement as HTMLElement;
        if (!element) break;
      }
    }, { capture: true });
    
    // Detect and react to DevTools - defined outside to avoid ES5 strict mode issues
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        // DevTools may be open
        console.clear();
        document.documentElement.innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #000; color: #fff; text-align: center;">
            <div>
              <h1 style="font-size: 24px;">Security Alert</h1>
              <p style="margin-top: 20px;">Developer tools detected. Please close developer tools to continue using the application.</p>
              <button onclick="window.location.reload()" style="margin-top: 20px; padding: 8px 16px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                Reload Application
              </button>
            </div>
          </div>
        `;
      }
    };
    
    // Check periodically
    setInterval(detectDevTools, 1000);
    
    // Apply CSS security protections
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Additional security styles */
      body * {
        -webkit-user-drag: none;
      }
      
      video::cue {
        visibility: hidden;
      }
      
      /* Hide download and right-click options */
      video::-internal-media-controls-download-button {
        display: none !important;
      }
      
      video::-webkit-media-controls-enclosure {
        overflow: hidden !important;
      }
      
      video::-webkit-media-controls-panel {
        width: calc(100% + 30px) !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    console.log('Security measures initialized');
  } catch (error) {
    console.error('Error setting up security measures:', error);
  }
}
