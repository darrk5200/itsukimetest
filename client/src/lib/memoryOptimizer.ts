/**
 * Memory optimization utilities to help reduce memory usage in the application
 * Enhanced with additional utilities for SPA performance
 */

/**
 * Creates a debounced version of a function that will only execute after waiting
 * for a specified delay with no further calls
 * 
 * @param func The function to debounce
 * @param wait The time in milliseconds to wait before executing
 * @returns A debounced version of the provided function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Memoizes a function to cache its results based on the arguments provided.
 * This helps prevent expensive recalculations when the same inputs are used.
 * 
 * @param fn The function to memoize
 * @returns A memoized version of the function
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    // Create a key from the arguments, handling undefined values
    const key = JSON.stringify(args, (_, value) => 
      value === undefined ? '__undefined__' : value
    );
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const iterator = cache.keys();
      const firstKey = iterator.next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
    
    return result;
  } as T;
}

/**
 * Creates a throttled version of a function that will execute at most once
 * in the specified time period, regardless of how many times it's called.
 * This is useful for functions attached to events that fire rapidly.
 * 
 * @param func The function to throttle
 * @param limit The time in milliseconds to wait between executions
 * @returns A throttled version of the provided function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(lastThis, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
      lastThis = this;
    }
  };
}

/**
 * Helps clean up resources by combining multiple cleanup functions into one
 * 
 * @param cleanupFns Array of cleanup functions to execute
 * @returns A single cleanup function that executes all provided cleanup functions
 */
export function createCleanupFn(...cleanupFns: Array<() => void>): () => void {
  return () => {
    cleanupFns.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    });
  };
}

/**
 * Clean up potentially memory leaking elements 
 * when navigating away from a component
 */
export function cleanupDOM(element: HTMLElement | null): void {
  if (!element) return;
  
  // Remove all event listeners (not perfect but helps)
  const clone = element.cloneNode(true) as HTMLElement;
  element.parentNode?.replaceChild(clone, element);
  
  // Remove references to potentially large objects
  const imgs = clone.querySelectorAll('img');
  imgs.forEach(img => {
    img.src = '';
    img.srcset = '';
  });
  
  // Remove video sources
  const videos = clone.querySelectorAll('video');
  videos.forEach(video => {
    // Remove all sources
    const sources = video.querySelectorAll('source');
    sources.forEach(source => source.remove());
    
    // Stop playback
    try {
      video.pause();
      video.src = '';
      video.load();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });
  
  // Remove iframe sources
  const iframes = clone.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    if (iframe.src) {
      iframe.src = 'about:blank';
    }
  });
}