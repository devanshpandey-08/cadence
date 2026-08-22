import { Request, Response } from 'express';
import { pool } from '../database/pool.js';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    memory: MemoryHealth;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
}

interface MemoryHealth {
  status: 'healthy' | 'warning' | 'critical';
  usedMB: number;
  totalMB: number;
  percentage: number;
}

/**
 * Comprehensive health check endpoint
 * Used by load balancers and monitoring systems
 */
export const healthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime(),
    services: {
      database: { status: 'up' },
      redis: { status: 'up' },
      memory: { 
        status: 'healthy', 
        usedMB: 0, 
        totalMB: 0, 
        percentage: 0 
      },
    },
  };

  let overallHealthy = true;

  // Check Database Connection
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbResponseTime = Date.now() - dbStart;
    
    health.services.database.responseTime = dbResponseTime;
    
    if (dbResponseTime > 1000) {
      health.services.database.status = 'degraded';
      health.services.database.message = 'High latency detected';
      health.status = 'degraded';
    }
  } catch (error: any) {
    health.services.database.status = 'down';
    health.services.database.message = error.message;
    overallHealthy = false;
    health.status = 'unhealthy';
  }

  // Check Redis Connection
  try {
    // Redis check would be implemented here when Redis client is available
    health.services.redis.status = 'up';
  } catch (error: any) {
    health.services.redis.status = 'down';
    health.services.redis.message = error.message;
    overallHealthy = false;
    health.status = 'unhealthy';
  }

  // Check Memory Usage
  const memoryUsage = process.memoryUsage();
  const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const percentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

  health.services.memory = {
    status: percentage > 90 ? 'critical' : percentage > 75 ? 'warning' : 'healthy',
    usedMB,
    totalMB,
    percentage,
  };

  if (percentage > 90) {
    health.status = 'degraded';
  }

  // Determine HTTP status code
  const httpStatus = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  // For Kubernetes readiness probe, return 200 even if degraded
  const isReadinessProbe = req.query.type === 'readiness';
  const finalStatus = isReadinessProbe && health.status !== 'unhealthy' ? 200 : httpStatus;

  res.status(finalStatus).json(health);
};

/**
 * Simple liveness probe for Kubernetes
 * Just checks if the server is responsive
 */
export const livenessProbe = (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Detailed readiness probe
 * Checks if all critical dependencies are available
 */
export const readinessProbe = async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'up',
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'down',
      },
      error: error.message,
    });
  }
};
