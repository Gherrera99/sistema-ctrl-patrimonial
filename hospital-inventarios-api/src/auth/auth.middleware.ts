import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const COOKIE = 'sid';

export const signJWT = (payload: any) => {
  const secret = process.env.JWT_SECRET || 'devsecret';
  return jwt.sign(payload, secret, { expiresIn: '12h' });
};

export const verifyJWT = (token: string) => {
  const secret = process.env.JWT_SECRET || 'devsecret';
  return jwt.verify(token, secret) as any;
};

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    (req as any).user = verifyJWT(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).user?.role;
  if (String(role) !== 'ADMIN') return res.status(403).json({ error: 'Solo admin' });
  next();
};
