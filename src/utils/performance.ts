import { Platform } from 'react-native';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private startTimes: Map<string, number> = new Map();
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start measuring an operation
  startMeasure(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }

  // End measuring and record the duration
  endMeasure(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(operation);

    // Store metrics
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Log if performance is poor
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }

    return duration;
  }

  // Get performance statistics
  getStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
  } | null {
    const measurements = this.metrics.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    return {
      count: measurements.length,
      average: measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
    };
  }

  // Clear metrics for an operation
  clearMetrics(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }

  // Get all performance data
  getAllStats(): Record<string, ReturnType<PerformanceMonitor['getStats']>> {
    const stats: Record<string, ReturnType<PerformanceMonitor['getStats']>> = {};
    for (const operation of this.metrics.keys()) {
      stats[operation] = this.getStats(operation);
    }
    return stats;
  }
}

// Memory usage monitoring (Android only)
export const getMemoryUsage = async (): Promise<{
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
} | null> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    // This would require native module implementation
    // For now, return mock data
    return {
      totalMemory: 8 * 1024 * 1024 * 1024, // 8GB
      freeMemory: 2 * 1024 * 1024 * 1024,  // 2GB
      usedMemory: 6 * 1024 * 1024 * 1024,  // 6GB
    };
  } catch (error) {
    console.error('Failed to get memory usage:', error);
    return null;
  }
};

// Bundle size optimization helpers
export const lazyImport = <T>(
  importFunc: () => Promise<T>,
  fallback?: T
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (fallback) {
        console.warn('Lazy import timed out, using fallback');
        resolve(fallback);
      } else {
        reject(new Error('Lazy import timed out'));
      }
    }, 5000);

    importFunc()
      .then((module) => {
        clearTimeout(timeout);
        resolve(module);
      })
      .catch((error) => {
        clearTimeout(timeout);
        if (fallback) {
          console.warn('Lazy import failed, using fallback:', error);
          resolve(fallback);
        } else {
          reject(error);
        }
      });
  });
};

// Image optimization helpers
export const getOptimalImageSize = (
  containerWidth: number,
  containerHeight: number,
  devicePixelRatio: number = 1
): { width: number; height: number } => {
  // Calculate optimal size considering device pixel ratio
  const optimalWidth = Math.ceil(containerWidth * devicePixelRatio);
  const optimalHeight = Math.ceil(containerHeight * devicePixelRatio);

  // Cap at reasonable maximums to prevent excessive memory usage
  const maxWidth = 1200;
  const maxHeight = 1200;

  return {
    width: Math.min(optimalWidth, maxWidth),
    height: Math.min(optimalHeight, maxHeight),
  };
};

// Network optimization
export const optimizeApiRequest = (
  url: string,
  options: RequestInit = {}
): RequestInit => {
  return {
    ...options,
    headers: {
      ...options.headers,
      // Compression
      'Accept-Encoding': 'gzip, deflate, br',
      // Cache control
      'Cache-Control': 'max-age=300', // 5 minutes
      // Mobile optimization
      'X-Mobile-Client': 'true',
      'X-Requested-With': 'XMLHttpRequest',
    },
  };
};

// Debounce utility for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Component render performance helper
export const measureRenderTime = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    start: () => monitor.startMeasure(`render_${componentName}`),
    end: () => monitor.endMeasure(`render_${componentName}`),
  };
};

// API request performance helper
export const measureApiCall = (endpoint: string) => {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    start: () => monitor.startMeasure(`api_${endpoint}`),
    end: () => monitor.endMeasure(`api_${endpoint}`),
  };
};

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();