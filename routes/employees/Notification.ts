import express, { Request, Response } from 'express';
import pool from '../../db/db';
import isEmployee from '../../middlewares/isEmployee';
import { authenticateToken } from '../../middlewares/authenticateToken';

const router = express.Router();

// Define interface to handle the user object attached by middleware
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

// --------------------------------------------------------
// Get All Notifications
// --------------------------------------------------------
router.get('/all', authenticateToken, isEmployee, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.sendStatus(401);

        // Added ORDER BY to show newest first
        const queryText = `
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;

        const notifications = await pool.query(queryText, [userId]);
        res.json({ Notifications: notifications.rows });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --------------------------------------------------------
// Mark ALL as Read
// (Must be defined BEFORE /:id to prevent routing conflicts)
// --------------------------------------------------------
router.patch('/mark-read/all', authenticateToken, isEmployee, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.sendStatus(401);

        const updatedNotification = await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1 RETURNING *',
            [userId]
        );
        res.json({ Notifications: updatedNotification.rows });
    } catch (error) {
        console.error('Error marking all notifications read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --------------------------------------------------------
// Mark Specific Notification as Read
// --------------------------------------------------------
router.patch('/mark-read/:id', authenticateToken, isEmployee, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.sendStatus(401);

        const notificationId = req.params.id;

        // Check ownership
        const notification = await pool.query(
            'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
            [notificationId, userId]
        );

        if (notification.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const updatedNotification = await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [notificationId, userId]
        );

        res.json({ Notification: updatedNotification.rows[0] });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --------------------------------------------------------
// Delete Notification
// --------------------------------------------------------
router.delete('/delete/:id', authenticateToken, isEmployee, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.sendStatus(401);

        const notificationId = req.params.id;

        // Check ownership before deleting
        const notification = await pool.query(
            'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
            [notificationId, userId]
        );

        if (notification.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const deletedNotification = await pool.query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
            [notificationId, userId]
        );

        res.json({ Notification: deletedNotification.rows[0] });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
