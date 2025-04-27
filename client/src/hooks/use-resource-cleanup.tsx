import { useEffect, useRef } from 'react';
import { resourceManager } from '@/lib/memoryOptimizer';

/**
 * Hook for managing component-level resource cleanup
 * Helps prevent memory leaks by ensuring proper cleanup when components unmount
 * 
 * @returns Object with functions to manage resources
 */
export function useResourceCleanup() {
  // Generate a unique ID for this component instance
  const componentId = useRef(`component-${Math.random().toString(36).substring(2, 9)}`);
  
  // Handle automatic cleanup on unmount
  useEffect(() => {
    return () => {
      resourceManager.cleanup(componentId.current);
    };
  }, []);
  
  // Return utilities for managing resources
  return {
    /**
     * Register a cleanup function to run when the component unmounts
     * @param cleanup Function to execute on cleanup
     */
    registerCleanup: (cleanup: () => void) => {
      resourceManager.register(componentId.current, cleanup);
    },
    
    /**
     * Create a callback function that registers event listeners with automatic cleanup
     * @param element Target element to attach listener to
     */
    createEventListener: <K extends keyof HTMLElementEventMap>(
      element: HTMLElement | null | undefined,
      eventType: K,
      listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (!element) return;
      
      element.addEventListener(eventType, listener, options);
      
      // Register cleanup
      resourceManager.register(componentId.current, () => {
        element.removeEventListener(eventType, listener, options);
      });
    },
    
    /**
     * Register a timer (setTimeout) with automatic cleanup
     * @param callback Function to execute
     * @param delay Delay in milliseconds
     * @returns Timer ID
     */
    setTimeout: (callback: () => void, delay: number) => {
      const timerId = setTimeout(callback, delay);
      
      resourceManager.register(componentId.current, () => {
        clearTimeout(timerId);
      });
      
      return timerId;
    },
    
    /**
     * Register an interval (setInterval) with automatic cleanup
     * @param callback Function to execute repeatedly
     * @param delay Delay between executions in milliseconds
     * @returns Interval ID
     */
    setInterval: (callback: () => void, delay: number) => {
      const intervalId = setInterval(callback, delay);
      
      resourceManager.register(componentId.current, () => {
        clearInterval(intervalId);
      });
      
      return intervalId;
    },
    
    /**
     * Manually trigger cleanup of all resources in this component
     */
    cleanup: () => {
      resourceManager.cleanup(componentId.current);
    }
  };
}