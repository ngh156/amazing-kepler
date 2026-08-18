import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { Role } from '@prisma/client';
import { redisPub } from '../../config/db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
  token?: string;
}

export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check Redis Blacklist for revoked tokens
    const isBlacklisted = await redisPub.get(`jwt_blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'TOKEN_REVOKED', message: 'Phiên làm việc đã bị hủy. Vui lòng đăng nhập lại!' });
    }

    const payload = jwt.verify(token, ENV.JWT_SECRET) as { id: string; email: string; role: Role };
    req.user = payload;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token is expired or invalid' });
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    next();
  };
}
