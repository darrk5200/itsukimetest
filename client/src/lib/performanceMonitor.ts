/**
 * Performance monitoring utilities to help track memory usage and component rendering
 */

interface PerformanceMetric {
  component: string;
  operation: string;
  duration: number;
  timestamp: number;
}

interface MemoryMetric {
  component?: string;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  timestamp: number;
}

// Store metrics with a cap on array size to prevent memory leaks
const MAX_METRICS = 100;
const renderMetrics: PerformanceMetric[] = [];
const memoryMetrics: MemoryMetric[] = [];

/**
 * Track component render time
 * 
 * @param component Component name
 * @param operation Operation being performed (mount, update, etc)
 * @param startTime Start time of the operation
 */
export function trackRender(component: string, operation: string, startTime: number): void {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  renderMetrics.push({
    component,
    operation,
    duration,
    timestamp: Date.now()
  });
  
  // Prevent memory leak by limiting array size
  if (renderMetrics.length > MAX_METRICS) {
    renderMetrics.shift();
  }
  
  // Log slow renders in development
  if (process.env.NODE_ENV === 'development' && duration > 16) {
    console.warn(`Slow ${operation} in ${component}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Track current memory usage
 * 
 * @param component Optional component name to associate with the measurement
 */
export function trackMemoryUsage(component?: string): void {
  if (!window.performance || !window.performance.memory) {
    return;
  }
  
  const memory = window.performance.memory as any;
  
  memoryMetrics.push({
    component,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    totalJSHeapSize: memory.totalJSHeapSize,
    usedJSHeapSize: memory.usedJSHeapSize,
    timestamp: Date.now()
  });
  
  // Prevent memory leak by limiting array size
  if (memoryMetrics.length > MAX_METRICS) {
    memoryMetrics.shift();
  }
  
  // Log high memory usage in development
  if (process.env.NODE_ENV === 'development') {
    const memoryUsageMB = memory.usedJSHeapSize / 1048576;
    const totalMemoryMB = memory.jsHeapSizeLimit / 1048576;
    const usagePercent = (memoryUsageMB / totalMemoryMB) * 100;
    
    if (usagePercent > 70) {
      console.warn(`High memory usage${component ? ` in ${component}` : ''}: ${memoryUsageMB.toFixed(2)}MB (${usagePercent.toFixed(2)}%)`);
    }
  }
}

/**
 * Create a higher-order component that tracks render performance
 * 
 * @param componentName Name of the component
 * @returns Function to wrap render methods
 */
export function withPerformanceTracking(componentName: string) {
  return <T extends any[], R>(fn: (...args: T) => R, operation: string): ((...args: T) => R) => {
    return (...args: T): R => {
      const startTime = performance.now();
      const result = fn(...args);
      trackRender(componentName, operation, startTime);
      return result;
    };
  };
}

/**
 * Get all collected metrics for analysis
 */
export function getPerformanceMetrics() {
  return {
    renderMetrics: [...renderMetrics],
    memoryMetrics: [...memoryMetrics]
  };
}

/**
 * Clear all collected metrics
 */
export function clearPerformanceMetrics() {
  renderMetrics.length = 0;
  memoryMetrics.length = 0;
}

// Schedule periodic garbage collection hints and memory tracking
if (process.env.NODE_ENV === 'development') {
  // Track memory every 30 seconds in development
  setInterval(() => {
    trackMemoryUsage('periodic-check');
  }, 30000);
}

// Extend the window performance object typings
declare global {
  interface Performance {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }
}