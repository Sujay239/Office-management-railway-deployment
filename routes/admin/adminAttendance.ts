import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';

const router = express.Router();

// YOUR REQUESTED FUNCTION
const formatTime = (isoString: string | null) => {
    if (!isoString) return "--";
    try {
        const date = new Date(isoString);
        // This will automatically handle the 5:30h offset based on the user's browser location
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return "--";
    }
};

// Helper for hours (Logic preserved)
const calculateTotalHours = (start: any, end: any) => {
    if (!start || !end) return "0h 00m";
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffMs = d2.getTime() - d1.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

router.get('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    try {
        const { mode, date, month, year } = req.query;

        if (mode === 'daily') {
            // SQL FIX: Combine date and time to create a valid ISO-like string
            const query = `
                SELECT
                    u.id as user_id,
                    u.name,
                    u.avatar_url,
                    u.designation,
                    COALESCE(a.status, 'Absent') as status,
                    (a.date + a.check_in_time) as check_in_iso,
                    (a.date + a.check_out_time) as check_out_iso,
                    a.id as attendance_id
                FROM users u
                LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
                WHERE u.role != 'admin' AND u.role != 'super_admin' AND u.status = 'Active'
                ORDER BY u.name ASC
            `;

            const result = await pool.query(query, [date]);

            const formattedData = result.rows.map(row => ({
                id: row.user_id,
                attendanceId: row.attendance_id,
                name: row.name,
                avatar: row.avatar_url,
                designation: row.designation,
                date: date,
                checkIn: formatTime(row.check_in_iso),
                checkOut: formatTime(row.check_out_iso),
                hours: calculateTotalHours(row.check_in_iso, row.check_out_iso),
                status: row.status
            }));

            return res.json(formattedData);

        } else if (mode === 'history') {
            const query = `
                SELECT
                    a.id,
                    to_char(a.date, 'YYYY-MM-DD') as date_str,
                    a.status,
                    (a.date + a.check_in_time) as check_in_iso,
                    (a.date + a.check_out_time) as check_out_iso,
                    u.name,
                    u.avatar_url,
                    u.designation
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE EXTRACT(MONTH FROM a.date) = $1
                  AND EXTRACT(YEAR FROM a.date) = $2
                ORDER BY a.date DESC
            `;

            const result = await pool.query(query, [month, year]);

            return res.json(result.rows.map(row => ({
                id: row.id,
                name: row.name,
                avatar: row.avatar_url,
                designation: row.designation,
                date: row.date_str,
                checkIn: formatTime(row.check_in_iso),
                checkOut: formatTime(row.check_out_iso),
                hours: calculateTotalHours(row.check_in_iso, row.check_out_iso),
                status: row.status
            })));
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
