import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import logger from '../utils/logger';
import { Role } from '@prisma/client';

export interface UserPayload {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: missing bearer token');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    logger.warn(`Authentication failed: invalid token. Error: ${err.message}`);
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.error('requireRole middleware executed before authenticateToken');
      return res.status(501).json({ error: 'Internal server routing error' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`RBAC violation: User ${req.user.userId} with role ${req.user.role} attempted to access resources restricted to ${roles.join(', ')}`);
      return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
    }

    next();
  };
};
