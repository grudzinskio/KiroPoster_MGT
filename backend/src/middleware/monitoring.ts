import { Request, Response, NextFunction } from 'express';
import { getPoolStatus, healthCheck } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * System metrics interface
 */
interface SystemMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  database: any;
  timestamp: string;
}

/**
 * Metrics collector class
 */
class MetricsCollector {
  private startTime: number;
  private lastCpuUsage: NodeJS.CpuUsage;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimeSum: number = 0;

  constructor() {
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
  }

  /**
   * Increment request counter
   */
  incrementRequests(): void {
    this.requestCount++;
  }

  /**
   * Increment error counter
   */
  incrementErrors(): void {
    this.errorCount++;
  }

  /**
   * Add response time
   */
  addResponseTime(time: number): void {
    this.responseTimeSum += time;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics & {
    requests: {
      total: number;
      errors: number;
      averageResponseTime: number;
    };
  } {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    return {
      uptime: Date.now() - this.startTime,
      memory: process.memoryUsage(),
      cpu: currentCpuUsage,
      database: getPoolStatus(),
      timestamp: new Date().toISOString(),
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        averageResponseTime: this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0
      }
    };
  }

  /**
   * Reset counters
   */
  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
  }
}

// Global metrics collector
const metricsCollector = new MetricsCollector();

/**
 * Metrics middleware
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  metricsCollector.incrementRequests();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metricsCollector.addResponseTime(responseTime);

    if (res.statusCode >= 400) {
      metricsCollector.incrementErrors();
    }

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.url}`, {
        responseTime,
        statusCode: res.statusCode,
        requestId: (req as any).requestId
      });
    }
  });

  next();
};

/**
 * Health check endpoint handler
 */
export const healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbHealth = await healthCheck();
    const metrics = metricsCollector.getMetrics();

    const health = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        used: Math.round(metrics.memory.heapUsed / 1024 / 1024),
        total: Math.round(metrics.memory.heapTotal / 1024 / 1024),
        external: Math.round(metrics.memory.external / 1024 / 1024)
      },
      requests: metrics.requests
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

    // Log health check if unhealthy
    if (health.status === 'unhealthy') {
      logger.error('Health check failed', health);
    }
  } catch (error) {
    logger.error('Health check error', { error: error instanceof Error ? error.message : error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

/**
 * Metrics endpoint handler
 */
export const metricsHandler = (req: Request, res: Response): void => {
  try {
    const metrics = metricsCollector.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics collection error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Failed to collect metrics'
    });
  }
};

/**
 * Start periodic monitoring
 */
export const startMonitoring = (): void => {
  const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000');

  setInterval(async () => {
    try {
      const metrics = metricsCollector.getMetrics();
      
      // Log system metrics
      logger.info('System metrics', {
        memory: Math.round(metrics.memory.heapUsed / 1024 / 1024),
        uptime: Math.round(metrics.uptime / 1000),
        requests: metrics.requests.total,
        errors: metrics.requests.errors,
        avgResponseTime: Math.round(metrics.requests.averageResponseTime)
      });

      // Check for memory leaks
      if (metrics.memory.heapUsed > 500 * 1024 * 1024) { // 500MB
        logger.warn('High memory usage detected', {
          heapUsed: Math.round(metrics.memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(metrics.memory.heapTotal / 1024 / 1024)
        });
      }

      // Check error rate
      const errorRate = metrics.requests.total > 0 ? 
        (metrics.requests.errors / metrics.requests.total) * 100 : 0;
      
      if (errorRate > 10) { // More than 10% error rate
        logger.warn('High error rate detected', {
          errorRate: Math.round(errorRate * 100) / 100,
          totalRequests: metrics.requests.total,
          totalErrors: metrics.requests.errors
        });
      }

      // Reset counters periodically to prevent overflow
      if (metrics.requests.total > 10000) {
        metricsCollector.reset();
      }

    } catch (error) {
      logger.error('Monitoring error', { error: error instanceof Error ? error.message : error });
    }
  }, interval);

  logger.info('Monitoring started', { interval });
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  // Give ongoing requests time to complete
  setTimeout(() => {
    logger.info('Graceful shutdown completed');
    process.exit(0);
  }, 5000);
};

// Set up graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default metricsCollector;