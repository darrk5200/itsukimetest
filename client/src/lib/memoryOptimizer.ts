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
 * Enhanced with LRU (Least Recently Used) caching strategy.
 * 
 * @param fn The function to memoize
 * @param maxSize Maximum number of results to cache (default: 100)
 * @returns A memoized version of the function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T, 
  maxSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>();
  const keyTimestamps = new Map<string, number>();
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    // Create a key from the arguments, handling undefined values
    const key = JSON.stringify(args, (_, value) => 
      value === undefined ? '__undefined__' : value
    );
    
    // If result is in cache, update access timestamp and return cached value
    if (cache.has(key)) {
      keyTimestamps.set(key, Date.now());
      return cache.get(key) as ReturnType<T>;
    }
    
    // Calculate the result
    const result = fn.apply(this, args);
    cache.set(key, result);
    keyTimestamps.set(key, Date.now());
    
    // Implement LRU (Least Recently Used) cache eviction
    if (cache.size > maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      keyTimestamps.forEach((timestamp, k) => {
        if (timestamp < oldestTime) {
          oldestTime = timestamp;
          oldestKey = k;
        }
      });
      
      if (oldestKey) {
        cache.delete(oldestKey);
        keyTimestamps.delete(oldestKey);
      }
    }
    
    return result;
  } as T;
}

/**
 * Creates a throttled version of a function that will execute at most once
 * in the specified time period, regardless of how many times it's called.
 * This is useful for functions attached to events that fire rapidly.
 * Enhanced with trailing call option.
 * 
 * @param func The function to throttle
 * @param limit The time in milliseconds to wait between executions
 * @param options Configuration options
 * @returns A throttled version of the provided function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { trailing?: boolean } = { trailing: true }
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let trailingTimeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    // Clear any existing trailing timeout
    if (trailingTimeout) {
      clearTimeout(trailingTimeout);
      trailingTimeout = null;
    }
    
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        
        // Execute trailing call if enabled and we have arguments
        if (options.trailing && lastArgs) {
          func.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, limit);
    } else if (options.trailing) {
      // Store the most recent call
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
 * Enhanced with more robust resource cleanup
 */
export function cleanupDOM(element: HTMLElement | null): void {
  if (!element) return;
  
  // Remove all event listeners (not perfect but helps)
  const clone = element.cloneNode(true) as HTMLElement;
  element.parentNode?.replaceChild(clone, element);
  
  // Recursively process all nodes to clean up various resource types
  const cleanNode = (node: Element): void => {
    // Clean up images
    if (node.nodeName === 'IMG') {
      const img = node as HTMLImageElement;
      img.src = '';
      img.srcset = '';
      img.removeAttribute('src');
      img.removeAttribute('srcset');
    }
    
    // Clean up videos
    if (node.nodeName === 'VIDEO') {
      const video = node as HTMLVideoElement;
      
      // Remove all sources
      Array.from(video.children).forEach(child => {
        if (child.nodeName === 'SOURCE') {
          child.remove();
        }
      });
      
      // Stop playback and free memory
      try {
        video.pause();
        video.src = '';
        video.textTracks.onaddtrack = null;
        video.textTracks.onremovetrack = null;
        video.load();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    
    // Clean up audio
    if (node.nodeName === 'AUDIO') {
      const audio = node as HTMLAudioElement;
      try {
        audio.pause();
        audio.src = '';
        audio.load();
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Clean up iframes
    if (node.nodeName === 'IFRAME') {
      const iframe = node as HTMLIFrameElement;
      if (iframe.src) {
        iframe.src = 'about:blank';
        iframe.removeAttribute('src');
      }
    }
    
    // Clean up canvases
    if (node.nodeName === 'CANVAS') {
      const canvas = node as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    // Process children recursively
    Array.from(node.children).forEach(cleanNode);
  };
  
  // Start recursive cleanup
  cleanNode(clone);
}

/**
 * Lightweight implementation of Virtual DOM for handling large lists
 * This helps with memory usage when rendering long lists by only rendering visible items
 * 
 * @param options Configuration for virtual list
 * @returns Functions to manage virtual list rendering
 */
export function createVirtualList<T>(options: {
  items: T[],
  itemHeight: number,
  overscan?: number,
  getKey: (item: T) => string | number
}) {
  const { items, itemHeight, getKey } = options;
  const overscan = options.overscan || 3;
  
  return {
    /**
     * Calculate which items should be rendered based on viewport
     * @param scrollTop Current scroll position
     * @param viewportHeight Visible height of the container
     * @returns Information needed to render the visible portion of the list
     */
    getVisibleItems(scrollTop: number, viewportHeight: number) {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const endIndex = Math.min(
        items.length - 1, 
        Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
      );
      
      const visibleItems = items.slice(startIndex, endIndex + 1);
      
      return {
        items: visibleItems,
        startIndex,
        endIndex,
        startOffset: startIndex * itemHeight,
        totalHeight: items.length * itemHeight,
        visibleItemsWithPositions: visibleItems.map((item, index) => ({
          item,
          key: getKey(item),
          position: (startIndex + index) * itemHeight
        }))
      };
    }
  };
}

/**
 * Resource manager to track and cleanup resources when components unmount
 * Helps prevent memory leaks from subscriptions and event listeners
 */
export class ResourceManager {
  private resources: Map<string, Array<() => void>> = new Map();
  
  /**
   * Register a resource with a cleanup function
   * @param id Unique identifier for the component or resource group
   * @param cleanup Function to call when cleaning up
   */
  register(id: string, cleanup: () => void): void {
    if (!this.resources.has(id)) {
      this.resources.set(id, []);
    }
    
    this.resources.get(id)?.push(cleanup);
  }
  
  /**
   * Cleanup all resources for a given ID
   * @param id ID of the component or resource group to clean up
   */
  cleanup(id: string): void {
    const cleanupFunctions = this.resources.get(id) || [];
    
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (err) {
        console.error(`Error cleaning up resource for ${id}:`, err);
      }
    });
    
    this.resources.delete(id);
  }
  
  /**
   * Clean up all tracked resources
   */
  cleanupAll(): void {
    this.resources.forEach((cleanupFunctions, id) => {
      this.cleanup(id);
    });
  }
}

// Create a singleton instance for app-wide resource management
export const resourceManager = new ResourceManager();

/**
 * Utility to optimize image loading to reduce memory usage
 * 
 * @param src Image source URL
 * @param options Configuration options
 * @returns Functions to interact with optimized image loading
 */
export function optimizedImageLoader(
  src: string,
  options: {
    lowQualitySrc?: string;
    loadOnVisible?: boolean;
  } = {}
) {
  const { lowQualitySrc, loadOnVisible = true } = options;
  let observer: IntersectionObserver | null = null;
  let loaded = false;
  
  return {
    getProps(elementRef: React.RefObject<HTMLImageElement>) {
      // Create props to be spread on an img element
      return {
        src: lowQualitySrc || src,
        loading: "lazy" as const,
        onLoad: () => {
          if (loaded) return;
          
          // Setup intersection observer for loading full image when visible
          if (loadOnVisible && elementRef.current && !loaded && 'IntersectionObserver' in window) {
            observer = new IntersectionObserver((entries) => {
              if (entries[0].isIntersecting) {
                const imgElement = elementRef.current;
                if (imgElement) {
                  imgElement.src = src;
                  loaded = true;
                }
                
                // Cleanup observer once loaded
                if (observer) {
                  observer.disconnect();
                  observer = null;
                }
              }
            });
            
            observer.observe(elementRef.current);
          }
        },
        onError: () => {
          console.error(`Failed to load image: ${src}`);
        }
      };
    },
    
    cleanup() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }
  };
}

/**
 * Lightweight event bus for component communication without prop drilling
 * Helps reduce memory usage by avoiding unnecessary re-renders
 */
export class EventBus {
  private subscribers: Map<string, Array<(...args: any[]) => void>> = new Map();
  
  /**
   * Subscribe to an event
   * @param event Event name
   * @param callback Function to call when event is emitted
   * @returns Unsubscribe function
   */
  subscribe<T extends any[]>(event: string, callback: (...args: T) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    
    this.subscribers.get(event)?.push(callback as any);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(event) || [];
      const index = callbacks.indexOf(callback as any);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Emit an event with arguments
   * @param event Event name
   * @param args Arguments to pass to subscribers
   */
  emit<T extends any[]>(event: string, ...args: T): void {
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in event handler for ${event}:`, err);
      }
    });
  }
  
  /**
   * Remove all subscribers for an event
   * @param event Event name to clear
   */
  clear(event?: string): void {
    if (event) {
      this.subscribers.delete(event);
    } else {
      this.subscribers.clear();
    }
  }
}

// Create a singleton event bus for the application
export const eventBus = new EventBus();