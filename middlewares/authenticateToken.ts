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

    // --- Single Session Enforcement ---
    if (user.role === 'admin' || user.role === 'super_admin') {
      try {
        const result = await pool.query('SELECT current_session_id FROM users WHERE id = $1', [user.id]);
        if (result.rows.length > 0) {
          const dbSessionId = result.rows[0].current_session_id;
          // If DB has a session ID and it doesn't match the token's session ID -> Unauthorized
          // If DB has NULL, maybe they logged out? Then token is invalid too.
          // If DB has session ID but token doesn't (old token), it should also be invalid if enforcement is strict.
          // Assuming tokens generated BEFORE this change have undefined sessionId.

          // Strict check: if (dbSessionId && user.sessionId !== dbSessionId)

          if (dbSessionId && user.sessionId !== dbSessionId) {
            res.clearCookie('token', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'none',
              path: '/'
            });
            return res.status(401).json({ message: 'Session expired. You logged in on another device.' });
          }
        }
      } catch (dbErr) {
        console.error("Session check error:", dbErr);
        // Fallback or Fail? Fail safe
        return res.status(500).json({ message: 'Internal server error during session validation' });
      }
    }

    (req as any).user = user;
    next();
  });
};


