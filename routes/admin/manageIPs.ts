import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';
import { enforce2FA } from '../../middlewares/enforce2FA.js';

const router = express.Router();

// Get all allowed IPs
router.get('/', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM allowed_ips ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching allowed IPs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Add a new allowed IP
router.post('/add', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const { ip_address, label } = req.body;

        if (!ip_address) {
            return res.status(400).json({ message: 'IP address is required' });
        }

        const result = await pool.query(
            'INSERT INTO allowed_ips (ip_address, label) VALUES ($1, $2) RETURNING *',
            [ip_address, label]
        );

        res.status(201).json({ message: 'IP address allowed successfully', ip: result.rows[0] });

    } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ message: 'IP address is already allowed' });
        }
        console.error('Error adding allowed IP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Remove an allowed IP
router.delete('/:id', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM allowed_ips WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'IP not found' });
        }

        res.json({ message: 'IP address removed successfully' });

    } catch (error) {
        console.error('Error removing allowed IP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
