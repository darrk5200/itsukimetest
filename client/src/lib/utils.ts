import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  getNotifyTimestampForAnime, 
  addNotification, 
  getNotifyTimestamps,
  getNotifications
} from "@/lib/storage";
import { Anime, Notification } from "@/lib/types";

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
 * Checks if a timestamp is within a certain number of days from the current date,
 * with proper handling of GMT+6 time zone.
 * 
 * @param timestamp The timestamp to check (can include timezone info like +06:00 or Z)
 * @param days Number of days to check against (default: 3)
 * @returns boolean indicating if the timestamp is within the specified number of days
 */
export
function isWithinDaysInGMT6(timestamp: string | undefined, days: number = 3): boolean {
  if (!timestamp) return false;
  
  try {
    // Parse the timestamp into a Date object 
    // JavaScript's Date constructor automatically handles timezone information
    // like +06:00 or Z suffix
    const releaseDate = new Date(timestamp);
    
    // Get current date
    const nowUTC = new Date();
    
    // If the timestamp doesn't include timezone info, assume it's in GMT+6 and convert to UTC
    // Note: With our updates, all timestamps should now have +06:00, but this is kept for backward compatibility
    if (!timestamp.includes('Z') && !timestamp.includes('+') && !timestamp.includes('-')) {
      // Convert from GMT+6 to UTC by subtracting 6 hours
      releaseDate.setHours(releaseDate.getHours() - 6);
      console.log('Converted timestamp to UTC:', timestamp, '→', releaseDate.toISOString());
    }
    
    // Calculate the threshold date (current time minus the days)
    const thresholdDate = new Date(nowUTC);
    thresholdDate.setDate(thresholdDate.getDate() - days);
    
    // Debug logging
    console.log('Timestamp comparison:', { 
      original: timestamp,
      release: releaseDate.toISOString(),
      now: nowUTC.toISOString(),
      threshold: thresholdDate.toISOString(),
      isWithinDays: releaseDate >= thresholdDate
    });
    
    // For a notification to appear, the episode release date should be MORE RECENT 
    // than the current time minus the days threshold
    return releaseDate >= thresholdDate;
  } catch (error) {
    console.error('Error checking if timestamp is within days:', error);
    return false;
  }
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
    if (!episodeReleaseTimestamp) {
      console.log('NOTIFY DEBUG: wasReleasedAfterNotificationEnabled - No episode release timestamp provided');
      return false;
    }
    
    // Get the timestamp when notifications were enabled for this anime
    const notifyTimestamp = getNotifyTimestampForAnime(animeId);
    if (!notifyTimestamp) {
      console.log(`NOTIFY DEBUG: wasReleasedAfterNotificationEnabled - No notification enabled timestamp for anime ID ${animeId}`);
      return false;
    }
    
    // Parse the release timestamp - this will automatically handle timezone information
    // such as +06:00 or Z suffix correctly
    const releaseDate = new Date(episodeReleaseTimestamp);
    
    // If the timestamp doesn't include timezone info, assume it's in GMT+6 and convert to UTC
    // Note: With our updates, all timestamps should now have +06:00, but this is kept for backward compatibility
    if (!episodeReleaseTimestamp.includes('Z') && !episodeReleaseTimestamp.includes('+') && !episodeReleaseTimestamp.includes('-')) {
      // Convert from GMT+6 to UTC by subtracting 6 hours
      releaseDate.setHours(releaseDate.getHours() - 6);
      console.log('NOTIFY DEBUG: Converted episode release timestamp to UTC:', episodeReleaseTimestamp, '→', releaseDate.toISOString());
    }
    
    // Parse the notification enabled timestamp (this is already in user's local timezone)
    const notifyDate = new Date(notifyTimestamp);
    
    // Important: If we're checking future timestamps (15:22 compared to current time 09:21), 
    // we need to handle this specially.
    // We'll assume any timestamp today is valid for notification purposes even if technically in future
    const isFutureTimestampToday = () => {
      const currentDate = new Date();
      const releaseDay = releaseDate.getDate();
      const releaseMonth = releaseDate.getMonth();
      const releaseYear = releaseDate.getFullYear();
      const today = new Date();
      
      // Check if it's today's date
      const isToday = releaseDay === today.getDate() && 
                      releaseMonth === today.getMonth() && 
                      releaseYear === today.getFullYear();
                      
      return isToday && releaseDate > currentDate;
    };
    
    // For future timestamps on current day, consider it valid
    const specialCaseToday = isFutureTimestampToday();
    
    // Debug logging
    console.log('NOTIFY DEBUG: Release vs Notification timestamp comparison:', { 
      releaseTimestamp: episodeReleaseTimestamp,
      releaseDate: releaseDate.toISOString(),
      notifyTimestamp: notifyTimestamp,
      notifyDate: notifyDate.toISOString(),
      specialCaseFutureToday: specialCaseToday,
      isReleasedAfter: specialCaseToday || releaseDate > notifyDate
    });
    
    // Episode should be released AFTER notifications were enabled
    // Special handling for today's future timestamped episodes
    return specialCaseToday || releaseDate > notifyDate;
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
    
    // Debug output for notification list
    console.log('NOTIFY DEBUG: Notification timestamps in local storage:', notifyList);
    
    if (!notifyList || notifyList.length === 0) {
      console.log('NOTIFY DEBUG: No anime in notification list. To receive notifications, click the bell icon on an anime card.');
      return;
    }
    
    // For each anime with notifications enabled
    for (const animeTimestamp of notifyList) {
      const animeId = animeTimestamp.animeId;
      const notificationEnabledTime = animeTimestamp.timestamp;
      
      // Find the anime in the list
      const anime = animes.find(a => a.id === animeId);
      
      if (!anime) {
        console.log(`NOTIFY DEBUG: Anime ID ${animeId} not found in anime list`);
        continue;
      }
      
      if (!anime.lastEpisodeTimestamp) {
        console.log(`NOTIFY DEBUG: Anime "${anime.anime_name}" has no lastEpisodeTimestamp`);
        continue;
      }
      
      // Get the latest episode timestamp
      const latestEpisodeTimestamp = anime.lastEpisodeTimestamp;
      
      // Log information about this anime's notification check
      console.log(`NOTIFY DEBUG: Checking notifications for anime: ${anime.anime_name} (ID: ${animeId})`, {
        lastEpisodeTimestamp: latestEpisodeTimestamp,
        notificationEnabledAt: notificationEnabledTime
      });
      
      // Use our improved wasReleasedAfterNotificationEnabled function to check
      // if the latest episode was released after the user enabled notifications
      const isReleasedAfterEnabled = wasReleasedAfterNotificationEnabled(animeId, latestEpisodeTimestamp);
      
      if (isReleasedAfterEnabled) {
        console.log(`NOTIFY DEBUG: Episode released after notification was enabled for ${anime.anime_name}`);
        
        // Check if the episode was released recently (within last 3 days)
        // This uses our improved isWithinDaysInGMT6 function
        const isWithinDays = isWithinDaysInGMT6(latestEpisodeTimestamp, 3);
        
        if (isWithinDays) {
          console.log(`NOTIFY DEBUG: Episode is recent (within 3 days) for ${anime.anime_name}`);
          
          // Get the latest episode
          let latestEpisodeId: number | undefined;
          
          // Check if episodes array exists and has episodes
          if (anime.episodes && anime.episodes.length > 0 && anime.releasedEpisodes > 0) {
            // Get the latest released episode
            const latestEpisodeIndex = Math.min(anime.releasedEpisodes - 1, anime.episodes.length - 1);
            latestEpisodeId = anime.episodes[latestEpisodeIndex]?.id;
          }
          
          if (!latestEpisodeId) {
            console.log(`NOTIFY DEBUG: Could not find latest episode ID for ${anime.anime_name}. Released episodes: ${anime.releasedEpisodes}, Episodes array length: ${anime.episodes?.length || 0}`);
            continue;
          }
          
          // Check if we've already watched this episode
          const alreadyWatched = hasWatchedLatestEpisode(animeId, latestEpisodeId);
          
          // Only notify if user hasn't watched it yet
          if (!alreadyWatched) {
            console.log(`NOTIFY DEBUG: Creating notification for unwatched episode of ${anime.anime_name}`);
            
            // Add notification
            addNotification({
              animeId: anime.id,
              animeName: anime.anime_name,
              message: `New episode ${anime.releasedEpisodes} is available to watch!`,
              episodeId: latestEpisodeId
            });
            
            // Check if notification was added successfully
            const notifications = getNotifications();
            const added = notifications.some(n => 
              n.animeId === anime.id && n.episodeId !== undefined && n.episodeId === latestEpisodeId
            );
            console.log(`NOTIFY DEBUG: Notification ${added ? 'was added successfully' : 'FAILED to add'}`);
            
          } else {
            console.log(`NOTIFY DEBUG: User has already watched episode ${anime.releasedEpisodes} of ${anime.anime_name}`);
          }
        } else {
          console.log(`NOTIFY DEBUG: Episode is not recent for ${anime.anime_name}`);
        }
      } else {
        console.log(`NOTIFY DEBUG: Episode released before notification was enabled for ${anime.anime_name}`);
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
    // Check if on mobile first - will be used for conditional security measures
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Disable right-click menu (contextmenu) except on mobile and form fields
    document.addEventListener('contextmenu', (e) => {
      // Always allow context menu on form inputs for accessibility
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return true;
      }
      
      // Also allow context menu on mobile devices for accessibility
      if (isMobileDevice) {
        return true;
      }
      
      e.preventDefault();
      return false;
    }, { capture: true });
    
    // Prevent key combinations that could open developer tools
    // Only apply these restrictions on desktop browsers
    if (!isMobileDevice) {
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
    }
    
    // Prevent copy operations for videos and sensitive content
    // Only for desktop, allow normal copy operations on mobile
    if (!isMobileDevice) {
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
    }
    
    // Detect and react to DevTools - completely disable for mobile
    const detectDevTools = () => {
      // Never run DevTools detection on mobile devices 
      if (isMobileDevice) {
        return;
      }
      
      try {
        // More reliable check for desktop browsers
        // These thresholds are for desktop only and would cause false positives on mobile
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        
        // Additional mobile safety check to prevent any false positives
        // If the screen is small, it's likely mobile, so we skip detection
        if (window.innerWidth <= 1024) {
          return;
        }
        
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
      } catch (error) {
        // If anything fails, don't break the app
        console.warn('DevTools detection error:', error);
      }
    };
    
    // Only run DevTools detection on desktop browsers, and with less frequency
    if (!isMobileDevice) {
      setInterval(detectDevTools, 3000);
    }
    
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
