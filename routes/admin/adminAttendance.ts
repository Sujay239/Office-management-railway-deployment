import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';

const router = express.Router();

// Get Attendance Data
router.get('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    try {
        const { mode, date, month, year } = req.query;

        if (mode === 'daily') {
            if (!date) {
                return res.status(400).json({ message: "Date is required for daily mode" });
            }

            // FIX: Use TO_CHAR in SQL to get exactly what is stored in the DB
            const query = `
                SELECT
                    u.id as user_id,
                    u.name,
                    u.avatar_url,
                    u.designation,
                    COALESCE(a.status, 'Absent') as status,
                    to_char(a.check_in_time, 'HH12:MI AM') as check_in_formatted,
                    to_char(a.check_out_time, 'HH12:MI AM') as check_out_formatted,
                    a.check_in_time,
                    a.check_out_time,
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
                // Use the pre-formatted string from SQL
                checkIn: row.check_in_formatted || '-',
                checkOut: row.check_out_formatted || '-',
                // Keep the calculation logic as is
                hours: calculateTotalHours(row.check_in_time, row.check_out_time),
                status: row.status
            }));

            return res.json(formattedData);

        } else if (mode === 'history') {
            if (!month || !year) {
                return res.status(400).json({ message: "Month and Year are required for history mode" });
            }

            const query = `
                SELECT
                    a.id,
                    to_char(a.date, 'YYYY-MM-DD') as date_str,
                    a.status,
                    to_char(a.check_in_time, 'HH12:MI AM') as check_in_formatted,
                    to_char(a.check_out_time, 'HH12:MI AM') as check_out_formatted,
                    a.check_in_time,
                    a.check_out_time,
                    u.name,
                    u.email,
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
                checkIn: row.check_in_formatted || '-',
                checkOut: row.check_out_formatted || '-',
                hours: calculateTotalHours(row.check_in_time, row.check_out_time),
                status: row.status
            }));

            return res.json(formattedData);
        }

    } catch (error) {
        console.error("Error fetching admin attendance:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Helper to calculate total hours (kept same as your original)
const calculateTotalHours = (startInput: any, endInput: any) => {
    if (!startInput || !endInput) return "0h 00m";
    try {
        const start = String(startInput).split(':');
        const end = String(endInput).split(':');
        
        let diffMins = (parseInt(end[0]) * 60 + parseInt(end[1])) - (parseInt(start[0]) * 60 + parseInt(start[1]));
        if (diffMins < 0) diffMins += 24 * 60;

        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    } catch (e) { return "-"; }
};

export default router;
