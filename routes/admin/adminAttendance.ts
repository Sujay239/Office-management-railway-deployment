import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';

const router = express.Router();


const formatTime = (timeInput: string | Date | null, dateStr?: string) => {
    if (!timeInput) return "-";

    try {
        let dateObj: Date;

        // 1. Normalize input to a Date object
        if (timeInput instanceof Date) {
            dateObj = new Date(timeInput);
        } else {
            const timeStr = String(timeInput);

            if (timeStr.includes('T')) {
                // If ISO string, parse directly
                dateObj = new Date(timeStr);
            } else if (dateStr) {
                // If HH:MM:SS + Date string (Treat input as UTC)
                const utcDateStr = `${dateStr}T${timeStr}Z`;
                dateObj = new Date(utcDateStr);
            } else {
                // If just HH:MM:SS without a date, create a dummy date to handle math
                // We assume the timeStr is UTC and we want to shift it
                const [h, m] = timeStr.split(':').map(Number);
                dateObj = new Date();
                dateObj.setUTCHours(h, m, 0, 0); 
            }
        }

        // Validate date
        if (isNaN(dateObj.getTime())) return String(timeInput);

        // 2. Add 5 Hours and 30 Minutes
        const IST_OFFSET_MS = (5 * 60 * 60 * 1000) + (30 * 60 * 1000); // 5h 30m in ms
        const shiftedDate = new Date(dateObj.getTime() + IST_OFFSET_MS);

        // 3. Format the Shifted Date
        // We use 'UTC' timezone here because we manually added the offset to the timestamp.
        // This ensures the formatting simply prints the shifted numbers we just calculated.
        return shiftedDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true,
            timeZone: 'UTC' 
        });

    } catch (e) {
        console.error("Time formatting error:", e);
        return String(timeInput);
    }
};


const calculateTotalHours = (startInput: string | Date | null, endInput: string | Date | null) => {
    // ... (Your existing code for calculateTotalHours is fine, 
    // as duration doesn't change even if you shift both start and end by +5:30)
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

        // Fallback for simple strings
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


// Get Attendance Data (Daily or History)
router.get('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    try {
        const { mode, date, month, year } = req.query;

        if (mode === 'daily') {
            if (!date) {
                return res.status(400).json({ message: "Date is required for daily mode" });
            }

            // Fetch all active employees and their attendance for the specific date
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
                WHERE u.role != 'admin' AND u.status = 'Active'
                ORDER BY u.name ASC
            `;

            const result = await pool.query(query, [date]);

            // Format data for frontend
            // We pass 'date' as string (from query) to formatTime to enable UTC conversion
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

            // Fetch attendance logs for the specific month and year
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
