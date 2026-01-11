import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';

const router = express.Router();

// Helper to format time (Fixed to avoid 5:30h timezone shift)
const formatTime = (timeInput: string | Date | null, dateStr?: string) => {
    if (!timeInput) return "-";

    try {
        // 1. If it's already a Date object (from a TIMESTAMP column)
        if (timeInput instanceof Date) {
            return timeInput.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }

        const timeStr = String(timeInput);

        // 2. Handle "HH:MM:SS" string (Postgres TIME type)
        // We split the string directly to avoid the JS Date object applying timezone offsets
        if (timeStr.includes(':') && !timeStr.includes('T')) {
            const parts = timeStr.split(':');
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            
            if (isNaN(h) || isNaN(m)) return timeStr;

            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
        }

        // 3. If it's an ISO string (contains 'T'), parse and use local time
        if (timeStr.includes('T')) {
            const dateObj = new Date(timeStr);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            }
        }

        return timeStr;
    } catch (e) {
        return String(timeInput);
    }
};

// Helper to calculate total hours (Logic preserved)
const calculateTotalHours = (startInput: string | Date | null, endInput: string | Date | null) => {
    if (!startInput || !endInput) return "0h 00m";

    try {
        let h1, m1, h2, m2;

        if ((startInput instanceof Date || String(startInput).includes('T')) &&
            (endInput instanceof Date || String(endInput).includes('T'))) {

            const startDate = new Date(startInput);
            const endDate = new Date(endInput);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "-";

            const diffMs = endDate.getTime() - startDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 0) return "0h 00m";

            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            return `${h}h ${m.toString().padStart(2, '0')}m`;
        }

        [h1, m1] = String(startInput).split(':').map(Number);
        [h2, m2] = String(endInput).split(':').map(Number);

        let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMins < 0) diffMins += 24 * 60; 

        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;

    } catch (e) {
        return "-";
    }
};

// Get Attendance Data
router.get('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    try {
        const { mode, date, month, year } = req.query;

        if (mode === 'daily') {
            if (!date) {
                return res.status(400).json({ message: "Date is required for daily mode" });
            }

            const query = `
                SELECT
                    u.id as user_id,
                    u.name,
                    u.avatar_url,
                    u.designation,
                    COALESCE(a.status, 'Absent') as status,
                    a.check_in_time,
                    a.check_out_time,
                    a.id as attendance_id
                FROM users u
                LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
               WHERE role != 'admin' AND role != 'super_admin' AND u.status = 'Active'
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
                checkIn: row.check_in_time ? formatTime(row.check_in_time, String(date)) : '-',
                checkOut: row.check_out_time ? formatTime(row.check_out_time, String(date)) : '-',
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
                checkIn: row.check_in_time ? formatTime(row.check_in_time, row.date_str) : '-',
                checkOut: row.check_out_time ? formatTime(row.check_out_time, row.date_str) : '-',
                hours: calculateTotalHours(row.check_in_time, row.check_out_time),
                status: row.status
            }));

            return res.json(formattedData);

        } else {
            return res.status(400).json({ message: "Invalid mode. Use 'daily' or 'history'." });
        }

    } catch (error) {
        console.error("Error fetching admin attendance:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
