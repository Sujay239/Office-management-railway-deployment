import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
// import isAdmin from '../../middlewares/isAdmin'; // Ideally create isSuperAdmin, but using isAdmin for now based on context or check role manually
import { enforce2FA } from '../../middlewares/enforce2FA.js';

const router = express.Router();

// Middleware to check for Super Admin specifically
const isSuperAdmin = async (req: Request, res: Response, next: express.NextFunction) => {
    // @ts-ignore
    const userId = req.user?.id;
    try {
        const result = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
        if (result.rows.length === 0 || result.rows[0].role !== 'super_admin') {
            return res.status(403).json({ message: "Access denied. Super Admin only." });
        }
        next();
    } catch (error) {
        console.error("Super Admin check error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

router.get('/', authenticateToken, isSuperAdmin, enforce2FA, async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const offset = (page - 1) * limit;

    try {
        const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');
        const totalLogs = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalLogs / limit);

        const query = `
            SELECT
                al.*,
                COALESCE(u.name, 'System') as actor_name,
                COALESCE(u.email, 'system') as actor_email,
                u.avatar_url as actor_avatar,
                COALESCE(CAST(u.role AS TEXT), 'System') as actor_role,
                u.designation as actor_designation
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(query, [limit, offset]);

        res.json({
            logs: result.rows,
            pagination: {
                total: totalLogs,
                page,
                limit,
                totalPages
            }
        });
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
