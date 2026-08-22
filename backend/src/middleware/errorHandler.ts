import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Global Error Handler Middleware
 * Catches all errors and returns appropriate HTTP response
 */
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  // Log error for debugging (in production, send to monitoring service)
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle PostgreSQL unique constraint violations
  if (err.message.includes('duplicate key') || err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'A record with this unique value already exists',
    });
  }

  // Handle PostgreSQL foreign key violations
  if (err.message.includes('foreign key') || err.code === '23503') {
    return res.status(400).json({
      error: 'Invalid Reference',
      message: 'Referenced resource does not exist',
    });
  }

  // Handle PostgreSQL check constraint violations
  if (err.code === '23514') {
    return res.status(400).json({
      error: 'Constraint Violation',
      message: 'Data violates database constraint',
    });
  }

  // Handle optimistic locking conflicts
  if (err.message?.includes('CONFLICT')) {
    return res.status(409).json({
      error: 'Version Conflict',
      message: err.message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token has expired',
    });
  }

  // Handle operational errors (known application errors)
  if (err.isOperational) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      error: err.name,
      message: err.message,
    });
  }

  // Handle unknown/programming errors
  // In production, don't leak internal error details
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.statusCode || 500).json({
    error: isProduction ? 'Internal Server Error' : err.name,
    message: isProduction 
      ? 'An unexpected error occurred. Please try again later.' 
      : err.message,
    ...(isProduction && { 
      traceId: generateTraceId() // For debugging in logs
    }),
  });
};

/**
 * Generate unique trace ID for error tracking
 */
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Async handler wrapper to catch promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create an operational error
 */
export class OperationalError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'OperationalError';

    Error.captureStackTrace(this, this.constructor);
  }
}
