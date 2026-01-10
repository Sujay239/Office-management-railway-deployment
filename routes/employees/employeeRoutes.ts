import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import decodeToken from '../../utils/decodeToken.js';
const router = express.Router();


router.get('/all',authenticateToken ,  async (req : Request, res : Response) => {
    try {
        const token = req.cookies?.token;
        if(!token){
            return res.status(401).json({ error: 'Authentication failed: Token is missing' });
        }

        const data : any = await decodeToken(token);

        if(!data){
            return res.status(401).json({ error: 'Authentication failed: Invalid token' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [data.email]);
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default router;
