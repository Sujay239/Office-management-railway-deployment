import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import decodeToken from '../../utils/decodeToken';
import isEmployee from '../../middlewares/isEmployee';
const router = express.Router();


router.get('/all',authenticateToken , isEmployee,  async (req : Request, res : Response) => {
    try {
        const token = req.cookies?.token;
        if(!token){
            return res.status(401).json({ error: 'Authentication failed: Token is missing' });
        }

        const data : any = await decodeToken(token);

        if(!data){
            return res.status(401).json({ error: 'Authentication failed: Invalid token' });
        }

        const result = await pool.query(
            'SELECT * FROM tasks WHERE assigned_to = $1',
            [data.id]
        );
        res.json({ tasks: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/update/processing/:id' , isEmployee , authenticateToken , async (req : Request, res : Response) => {
    try {
        const token = req.cookies?.token;
        if(!token){
            return res.status(401).json({ error: 'Authentication failed: Token is missing' });
        }

        const data : any = await decodeToken(token);

        if(!data){
            return res.status(401).json({ error: 'Authentication failed: Invalid token' });
        }

        const result = await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2',
            ['In Progress' , req.params.id]
        );
        res.json({ message: 'Task updated successfully' });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



router.patch('/update/completed/:id' , isEmployee , authenticateToken , async (req : Request, res : Response) => {
    try {
        const token = req.cookies?.token;
        if(!token){
            return res.status(401).json({ error: 'Authentication failed: Token is missing' });
        }

        const data : any = await decodeToken(token);

        if(!data){
            return res.status(401).json({ error: 'Authentication failed: Invalid token' });
        }

        const result = await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2',
            ['Completed' , req.params.id]
        );
        res.json({ message: 'Task updated successfully' });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
