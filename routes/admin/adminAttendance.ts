import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';

const router = express.Router();

/**
 * HELPER: Formats "14:30:00" (from DB) to "02:30 PM" (for UI)
 * This ensures Admin side matches User side formatting.
 */
const formatToUserStyle = (timeStr: string | null): string => {
    if (!timeStr || timeStr === null) return "-";
    try {
        const [hours, minutes] = timeStr.split(':');
        let h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12; // Converts 0 to 12
        
        // Return format: "02:30 PM"
        return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (e) {
        return "-";
    }
};

/**
 * HELPER: Calculates total working duration
 */
const calculateTotalHours = (startStr: string | null, endStr: string | null): string => {
    if (!startStr || !endStr) return "0h 00m";
    try {
        const [h1, m1] = startStr.split(':').map(Number);
        const [h2, m2] = endStr.split(':').map(Number);

        let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMins < 0) diffMins += 24 * 60; 

        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    } catch (e) {
        return "0h 00m";
    }
};

router.get('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    try {
        const { mode, date, month, year } = req.query;

        if (mode === 'daily') {
            if (!date) return res.status(400).json({ message: "Date is required" });

            const query = `
                SELECT
                    u.id as user_id,
                    u.name,
                    u.avatar_url,
                    u.designation,
                    COALESCE(a.status, 'Absent') as status,
                    to_char(a.check_in_time, 'HH24:MI:SS') as check_in_raw,
                    to_char(a.check_out_time, 'HH24:MI:SS') as check_out_raw,
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
                date: String(date),
                // Send formatted strings to match User-side look
                checkIn: formatToUserStyle(row.check_in_raw),
                checkOut: formatToUserStyle(row.check_out_raw),
                hours: calculateTotalHours(row.check_in_raw, row.check_out_raw),
                status: row.status
            }));

            return res.json(formattedData);

        } else if (mode === 'history') {
            if (!month || !year) return res.status(400).json({ message: "Month/Year required" });

            const query = `
                SELECT
                    a.id,
                    to_char(a.date, 'YYYY-MM-DD') as date_str,
                    a.status,
                    to_char(a.check_in_time, 'HH24:MI:SS') as check_in_raw,
                    to_char(a.check_out_time, 'HH24:MI:SS') as check_out_raw,
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

            const formattedData = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                avatar: row.avatar_url,
                designation: row.designation,
                date: row.date_str,
                checkIn: formatToUserStyle(row.check_in_raw),
                checkOut: formatToUserStyle(row.check_out_raw),
                hours: calculateTotalHours(row.check_in_raw, row.check_out_raw),
                status: row.status
            }));

            return res.json(formattedData);
        }

    } catch (error) {
        console.error("Admin Attendance Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
