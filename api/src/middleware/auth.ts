import { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken, TokenPayload, Role } from '../lib/jwt';

// Lets us write req.user in every route
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }
  let tokenPayload: TokenPayload;
  try {
    tokenPayload = verifyToken(header.split(' ')[1]);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  if (!Number.isSafeInteger(tokenPayload.id) || tokenPayload.id < 1) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  prisma.user
    .findUnique({
      where: { id: tokenPayload.id },
      select: { id: true, role: { select: { name: true } } },
    })
    .then((user) => {
      if (!user) return res.status(401).json({ message: 'Invalid or expired token' });
      req.user = { id: user.id, role: user.role.name };
      next();
    })
    .catch(next);
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission' });
    }
    next();
  };

export const requirePermission =
  (permissionKey: string): RequestHandler =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Missing or invalid token' });

    prisma.rolePermission
      .findFirst({
        where: {
          role: { name: req.user.role },
          permission: { key: permissionKey },
        },
        select: { roleId: true },
      })
      .then((grant) => {
        if (!grant) {
          return res.status(403).json({ message: `Missing permission: ${permissionKey}` });
        }
        next();
      })
      .catch(next);
  };