import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import isAdmin from '../../middlewares/isAdmin';
import { enforce2FA } from '../../middlewares/enforce2FA';

const router = express.Router();

// Get all holidays
router.get('/all', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM holidays ORDER BY date ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add a new holiday
router.post('/add', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    const { name, date, type } = req.body;

    if (!name || !date || !type) {
        return res.status(400).json({ message: 'Name, date, and type are required' });
    }

    try {
        // Calculate day name from date
        const dateObj = new Date(date);
        const day = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

        const result = await pool.query(
            'INSERT INTO holidays (name, date, day, type) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, date, day, type]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding holiday:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update a holiday
router.put('/update/:id', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, date, type } = req.body;

    if (!name || !date || !type) {
        return res.status(400).json({ message: 'Name, date, and type are required' });
    }

    try {
        const dateObj = new Date(date);
        const day = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

        const result = await pool.query(
            'UPDATE holidays SET name = $1, date = $2, day = $3, type = $4 WHERE id = $5 RETURNING *',
            [name, date, day, type, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Holiday not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating holiday:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Remove a holiday
router.delete('/remove/:id', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM holidays WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Holiday not found' });
        }

        res.status(200).json({ message: 'Holiday removed successfully' });
    } catch (error) {
        console.error('Error removing holiday:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
