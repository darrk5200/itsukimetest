/**
 * Utility for monitoring and managing memory usage in the SPA
 */

// Configuration for memory monitoring
interface MemoryMonitorConfig {
  // Maximum entries in the history array to prevent memory leaks
  maxHistoryEntries: number;
  
  // Interval in ms to check memory usage
  checkInterval: number;
  
  // Threshold in MB to trigger cleanup recommendations
  cleanupThreshold: number;
  
  // Callback when memory usage exceeds threshold
  onHighMemoryUsage?: (usage: MemoryUsage) => void;
}

// Memory usage data structure
export interface MemoryUsage {
  timestamp: number; // Unix timestamp
  jsHeapSizeLimit?: number; // Maximum heap size in bytes
  totalJSHeapSize?: number; // Currently allocated heap size in bytes
  usedJSHeapSize?: number; // Currently used heap size in bytes
  usedPercentage?: number; // Used heap as percentage of limit
}

// Default configuration
const DEFAULT_CONFIG: MemoryMonitorConfig = {
  maxHistoryEntries: 50,
  checkInterval: 30000, // 30 seconds
  cleanupThreshold: 150, // 150MB
};

// Class to monitor memory usage
export class MemoryMonitor {
  private config: MemoryMonitorConfig;
  private history: MemoryUsage[] = [];
  private intervalId: number | null = null;
  private isRunning = false;
  
  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Start monitoring memory usage at regular intervals
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.checkMemoryUsage();
    
    this.intervalId = window.setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.checkInterval);
  }
  
  /**
   * Stop monitoring memory usage
   */
  stop(): void {
    if (!this.isRunning) return;
    
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }
  
  /**
   * Check current memory usage and update history
   */
  checkMemoryUsage(): MemoryUsage {
    const memory = (window.performance as any).memory;
    const now = Date.now();
    
    const usage: MemoryUsage = {
      timestamp: now,
    };
    
    if (memory) {
      // Convert bytes to MB for easier human reading
      const mbDivisor = 1024 * 1024;
      
      usage.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      usage.totalJSHeapSize = memory.totalJSHeapSize;
      usage.usedJSHeapSize = memory.usedJSHeapSize;
      
      if (memory.jsHeapSizeLimit) {
        usage.usedPercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      }
      
      // Check if we need to recommend cleanup
      const usedMB = memory.usedJSHeapSize / mbDivisor;
      
      if (usedMB > this.config.cleanupThreshold && this.config.onHighMemoryUsage) {
        this.config.onHighMemoryUsage(usage);
      }
    }
    
    // Add to history and trim if needed
    this.history.push(usage);
    
    if (this.history.length > this.config.maxHistoryEntries) {
      this.history = this.history.slice(-this.config.maxHistoryEntries);
    }
    
    return usage;
  }
  
  /**
   * Get memory usage history
   */
  getHistory(): MemoryUsage[] {
    return [...this.history];
  }
  
  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }
  
  /**
   * Get latest memory usage
   */
  getLatestUsage(): MemoryUsage | null {
    if (this.history.length === 0) {
      return this.checkMemoryUsage();
    }
    
    return this.history[this.history.length - 1];
  }
  
  /**
   * Recommend actions to optimize memory usage
   * based on recent memory profile
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const latestUsage = this.getLatestUsage();
    
    if (!latestUsage || !latestUsage.usedPercentage) {
      return ["Memory information not available"];
    }
    
    // Check memory usage trend
    const usageIncreasing = this.isMemoryUsageIncreasing();
    
    // Add recommendations based on memory usage patterns
    if (latestUsage.usedPercentage > 80) {
      recommendations.push("Critical: Memory usage is very high. Consider immediate garbage collection.");
    } else if (latestUsage.usedPercentage > 60) {
      recommendations.push("Warning: Memory usage is high. Consider implementing additional memory optimizations.");
    }
    
    if (usageIncreasing) {
      recommendations.push("Memory usage is steadily increasing, which could indicate a memory leak.");
    }
    
    // Add general recommendations
    if (this.history.length > 10) {
      recommendations.push("Consider implementing virtual scrolling for long lists.");
      recommendations.push("Unload unused components and clear their state when navigating away.");
      recommendations.push("Optimize large images and media files with lazy loading.");
    }
    
    return recommendations;
  }
  
  /**
   * Check if memory usage is increasing over time
   */
  private isMemoryUsageIncreasing(): boolean {
    if (this.history.length < 5) return false;
    
    // Look at the last 5 entries
    const recentEntries = this.history.slice(-5);
    
    // Calculate the trend (positive slope means increasing)
    let increasingCount = 0;
    
    for (let i = 1; i < recentEntries.length; i++) {
      const current = recentEntries[i].usedJSHeapSize || 0;
      const previous = recentEntries[i-1].usedJSHeapSize || 0;
      
      if (current > previous) {
        increasingCount++;
      }
    }
    
    // If most recent entries show an increase, return true
    return increasingCount >= 3;
  }
}

// Create singleton instance
export const memoryMonitor = new MemoryMonitor({
  onHighMemoryUsage: (usage) => {
    console.warn(
      `High memory usage detected: ${(usage.usedJSHeapSize || 0) / (1024 * 1024)}MB ` +
      `(${usage.usedPercentage?.toFixed(2)}%)`
    );
  }
});