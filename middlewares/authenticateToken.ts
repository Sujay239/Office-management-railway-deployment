import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication failed: Token is missing' });
  }

  await jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Authentication failed: Invalid or expired token' });
    }

    (req as any).user = user;
    next();
  });
};


