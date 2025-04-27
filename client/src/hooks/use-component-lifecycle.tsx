import { useEffect, useRef } from 'react';
import { useResourceCleanup } from './use-resource-cleanup';
import { trackRender, trackMemoryUsage } from '@/lib/performanceMonitor';

/**
 * Hook for managing component lifecycle with performance tracking and memory optimization
 * 
 * @param componentName Name of the component for tracking
 * @returns Utilities for tracking component lifecycle
 */
export function useComponentLifecycle(componentName: string) {
  const startTime = useRef(performance.now());
  const { registerCleanup } = useResourceCleanup();
  
  // Track mounting time
  useEffect(() => {
    trackRender(componentName, 'mount', startTime.current);
    trackMemoryUsage(componentName);

    // Track component unmounting
    return () => {
      trackRender(componentName, 'unmount', performance.now());
      trackMemoryUsage(componentName);
    };
  }, [componentName]);
  
  // Return tracking functions for component updates
  return {
    /**
     * Track a component update
     * Call this in useEffect hooks that handle updates
     */
    trackUpdate: () => {
      const updateStartTime = performance.now();
      trackRender(componentName, 'update', updateStartTime);
    },
    
    /**
     * Track a render caused by state change
     * Call this just before any state-changing function
     */
    trackStateChange: (stateName: string) => {
      const changeStartTime = performance.now();
      return () => {
        trackRender(componentName, `state:${stateName}`, changeStartTime);
      };
    },
    
    /**
     * Register a forced garbage collection hint on component unmount
     * This can help reduce memory pressure in components that handle large data
     */
    registerGCHint: () => {
      if (window.gc) {
        registerCleanup(() => {
          // This adds a hint to the garbage collector if exposed by the browser
          try {
            (window as any).gc?.();
          } catch (e) {
            // Ignore if gc is not available
          }
        });
      }
    },
    
    /**
     * Track heap snapshot before and after an operation
     * Useful for detecting memory leaks or excessive allocations
     * 
     * @param operationName Name of the operation being tracked
     * @param operation Function to execute and track
     */
    trackHeapUsage: async function<T>(operationName: string, operation: () => Promise<T> | T): Promise<T> {
      trackMemoryUsage(`${componentName}:${operationName}:before`);
      
      const result = await operation();
      
      // Give browser a chance to run GC
      await new Promise(resolve => setTimeout(resolve, 100));
      
      trackMemoryUsage(`${componentName}:${operationName}:after`);
      return result;
    }
  };
}