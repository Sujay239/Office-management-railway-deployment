import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import pool from '../db/db.js';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication failed: Token is missing' });
  }

  await jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Authentication failed: Invalid or expired token' });
    }

    // --- Session Consistency Check for ALL Users ---
    try {
      const result = await pool.query('SELECT current_session_id FROM users WHERE id = $1', [user.id]);

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      const dbSessionId = result.rows[0].current_session_id;
      const tokenSessionId = user.sessionId || null;

      if (dbSessionId !== tokenSessionId) {
        res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
          path: '/'
        });
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
      }
    } catch (dbErr) {
      console.error("Session check error:", dbErr);
      return res.status(500).json({ message: 'Internal server error during session validation' });
    }

    (req as any).user = user;
    next();
  });
};


