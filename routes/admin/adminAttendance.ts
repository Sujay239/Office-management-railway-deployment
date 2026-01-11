import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';

const router = express.Router();

// YOUR FORMAT FUNCTION
const formatTime = (isoString: string | null) => {
    if (!isoString) return "--";
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return "--";
    }
};

// HELPER TO CALCULATE HOURS
const calculateTotalHours = (startIso: string | null, endIso: string | null) => {
    if (!startIso || !endIso) return "0h 00m";
    try {
        const startDate = new Date(startIso);
        const endDate = new Date(endIso);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "0h 00m";

        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 0) return "0h 00m";

        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    } catch (e) {
        return "0h 00m";
    }
};

// Get Attendance Data
router.get('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    try {
        const { mode, date, month, year } = req.query;

        if (mode === 'daily') {
            if (!date) return res.status(400).json({ message: "Date is required" });

            // SQL: Combining date and time so formatTime gets a full ISO string
            const query = `
                SELECT
                    u.id as user_id,
                    u.name,
                    u.avatar_url,
                    u.designation,
                    COALESCE(a.status, 'Absent') as status,
                    (a.date + a.check_in_time) as check_in_full,
                    (a.date + a.check_out_time) as check_out_full,
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
                checkIn: formatTime(row.check_in_full),
                checkOut: formatTime(row.check_out_full),
                hours: calculateTotalHours(row.check_in_full, row.check_out_full),
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
                    (a.date + a.check_in_time) as check_in_full,
                    (a.date + a.check_out_full) as check_out_full,
                    u.name,
                    u.avatar_url,
                    u.designation
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE EXTRACT(MONTH FROM a.date) = $1
                  AND EXTRACT(YEAR FROM a.date) = $2
                ORDER BY a.date DESC, a.check_in_time DESC
            `;

            const result = await pool.query(query, [month, year]);

            const formattedData = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                avatar: row.avatar_url,
                designation: row.designation,
                date: row.date_str,
                checkIn: formatTime(row.check_in_full),
                checkOut: formatTime(row.check_out_full),
                hours: calculateTotalHours(row.check_in_full, row.check_out_full),
                status: row.status
            }));

            return res.json(formattedData);
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
