// AOP-style Decorators for Cross-cutting Concerns
// Eliminates logging and performance monitoring duplication

export interface MethodPerformanceData {
  methodName: string;
  executionTime: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface LoggingConfig {
  enableConsoleLogging?: boolean;
  enablePerformanceTracking?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  includeArgs?: boolean;
  includeResult?: boolean;
}

// Performance monitoring decorator
export function TrackPerformance(config: LoggingConfig = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const methodName = `${target.constructor.name}.${propertyKey}`;

      try {
        // Log method entry
        if (config.enableConsoleLogging !== false) {
          console.log(`🚀 ${methodName} started`, config.includeArgs ? { args } : '');
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);
        const executionTime = performance.now() - startTime;

        // Log success
        if (config.enableConsoleLogging !== false) {
          const logLevel = config.logLevel || 'info';
          console[logLevel](`✅ ${methodName} completed in ${executionTime.toFixed(2)}ms`,
            config.includeResult ? { result } : '');
        }

        // Track performance metrics
        if (config.enablePerformanceTracking !== false) {
          trackMethodPerformance({
            methodName,
            executionTime,
            timestamp: new Date(),
            success: true
          });
        }

        return result;
      } catch (error) {
        const executionTime = performance.now() - startTime;

        // Log error
        if (config.enableConsoleLogging !== false) {
          console.error(`❌ ${methodName} failed in ${executionTime.toFixed(2)}ms:`, error);
        }

        // Track error performance
        if (config.enablePerformanceTracking !== false) {
          trackMethodPerformance({
            methodName,
            executionTime,
            timestamp: new Date(),
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }

        throw error;
      }
    };

    return descriptor;
  };
}

// API call logging decorator
export function LogApiCall(config: LoggingConfig = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const methodName = `${target.constructor.name}.${propertyKey}`;
      const startTime = Date.now();

      try {
        console.log(`📡 API Call: ${methodName}`, config.includeArgs ? { args } : '');

        const result = await originalMethod.apply(this, args);

        const duration = Date.now() - startTime;
        console.log(`📡 API Response: ${methodName} completed in ${duration}ms`,
          config.includeResult ? { result } : '');

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`📡 API Error: ${methodName} failed in ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

// Global performance tracking store
const performanceMetrics: MethodPerformanceData[] = [];
const MAX_METRICS = 1000;

function trackMethodPerformance(data: MethodPerformanceData) {
  performanceMetrics.push(data);

  // Keep only recent metrics to prevent memory leaks
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.splice(0, performanceMetrics.length - MAX_METRICS);
  }
}

// Get performance metrics (for debugging)
export function getPerformanceMetrics(): MethodPerformanceData[] {
  return [...performanceMetrics];
}

// Get performance summary
export function getPerformanceSummary() {
  if (performanceMetrics.length === 0) {
    return { totalCalls: 0, averageExecutionTime: 0, successRate: 0 };
  }

  const totalCalls = performanceMetrics.length;
  const successfulCalls = performanceMetrics.filter(m => m.success).length;
  const averageExecutionTime = performanceMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalCalls;

  return {
    totalCalls,
    averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
    successRate: Math.round((successfulCalls / totalCalls) * 100 * 100) / 100
  };
}

// Error boundary decorator for React components
export function WithErrorBoundary(config: { fallback?: string } = {}) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);

        // Wrap all methods with error handling
        Object.getOwnPropertyNames(constructor.prototype).forEach(methodName => {
          if (methodName !== 'constructor' && typeof this[methodName] === 'function') {
            const originalMethod = this[methodName];
            this[methodName] = function (...methodArgs: any[]) {
              try {
                return originalMethod.apply(this, methodArgs);
              } catch (error) {
                console.error(`Error in ${constructor.name}.${methodName}:`, error);
                if (config.fallback) {
                  console.log(`Using fallback: ${config.fallback}`);
                }
                throw error;
              }
            };
          }
        });
      }
    };
  };
}