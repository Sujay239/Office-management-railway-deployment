import { Request, Response, NextFunction } from 'express';
import pool from '../db/db.js';
import decodeToken from '../utils/decodeToken.js';

export const enforce2FA = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;

   if(!token){
    return res.status(401).json({ message: 'Authentication required' });
   }

   const data : any = await decodeToken(token);

    try {
        // Check if user has 2FA enabled in DB (fetching fresh state is safer than token)
        const result = await pool.query('SELECT two_factor_enabled FROM users WHERE id = $1', [data.id]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        const is2FAEnabled = result.rows[0].two_factor_enabled;

       
        if (!is2FAEnabled) {
            return next();
        }

        // If 2FA IS enabled, check token claim
        // user object comes from JWT payload, so it has is2FAVerified
        if (data.is2FAVerified) {
            return next();
        } else {
            return res.status(403).json({ message: '2FA verification required' });
        }

    } catch (error) {
        console.error('Error in enforce2FA middleware:', error);
        return res.status(500).json({ message: 'Server error checking 2FA status' });
    }
};
