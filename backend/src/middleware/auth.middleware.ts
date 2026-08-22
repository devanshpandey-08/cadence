import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/pool.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    org_id: string;
    role: string;
    is_super_admin: boolean;
  };
}

/**
 * Tenant Context Middleware
 * Sets PostgreSQL session variable for Row Level Security (RLS)
 * This is CRITICAL for multi-tenant data isolation
 */
export const tenantContext = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Set the org_id in the PostgreSQL session for RLS policies
    await pool.query('SET LOCAL app.current_org_id = $1', [req.user.org_id]);
    
    // Also set super admin flag if applicable
    await pool.query('SET LOCAL app.is_super_admin = $1', [req.user.is_super_admin || false]);
    
    next();
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    res.status(500).json({ error: 'Database session error' });
  }
};

/**
 * Authentication Middleware
 * Validates JWT token and extracts user context
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      org_id: decoded.org_id,
      role: decoded.role,
      is_super_admin: decoded.is_super_admin || false,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if user has required role/permission
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Super admins can access everything
    if (req.user.is_super_admin) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Role ${req.user.role} does not have permission to access this resource` 
      });
    }

    next();
  };
};

/**
 * Resource Ownership Validation
 * Prevents IDOR attacks by verifying user owns/accesses the resource
 */
export const checkResourceOwnership = (resourceType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      return next();
    }

    try {
      let tableName: string;
      switch (resourceType) {
        case 'contact':
          tableName = 'contacts';
          break;
        case 'company':
          tableName = 'companies';
          break;
        case 'deal':
          tableName = 'deals';
          break;
        case 'ticket':
          tableName = 'tickets';
          break;
        default:
          return next();
      }

      const result = await pool.query(
        `SELECT org_id FROM ${tableName} WHERE id = $1`,
        [resourceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Verify resource belongs to user's organization
      if (result.rows[0].org_id !== req.user.org_id && !req.user.is_super_admin) {
        return res.status(403).json({ error: 'Access denied to this resource' });
      }

      next();
    } catch (error) {
      console.error('Ownership check failed:', error);
      res.status(500).json({ error: 'Failed to validate resource ownership' });
    }
  };
};
