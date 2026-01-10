import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';
import { logAudit } from '../../utils/auditLogger.js';

const router = express.Router();

// Send Notification
router.post('/send', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    const { user_ids, title, message, type, send_to_all } = req.body;

    if (!title || !message) {
        return res.status(400).json({ message: "Title and Message are required." });
    }

    try {
        let targets = [];

        if (send_to_all) {
            // Fetch all active employees
            const usersRes = await pool.query("SELECT id FROM users WHERE role = 'employee' AND status = 'Active'");
            targets = usersRes.rows.map(row => row.id);
        } else {
            targets = user_ids || [];
        }

        if (targets.length === 0) {
            return res.status(400).json({ message: "No users selected." });
        }

        // Insert notifications in parallel
        const query = `
            INSERT INTO notifications (user_id, title, message, type)
            VALUES ($1, $2, $3, $4)
        `;

        const promises = targets.map((uid: number) => {
            return pool.query(query, [uid, title, message, type || 'info']);
        });

        await Promise.all(promises);

        await logAudit(
            // @ts-ignore
            req.user?.id,
            'NOTIFICATION_SENT',
            'notifications',
            null,
            { title, type, recipients_count: targets.length, send_to_all },
            req
        );

        res.status(200).json({ message: "Notifications sent successfully.", count: targets.length });

    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
