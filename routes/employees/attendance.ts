import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import isEmployee from '../../middlewares/isEmployee';

const router = express.Router();

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

// --------------------------------------------------------
// Get Attendance History & Stats
// --------------------------------------------------------
router.get('/history', authenticateToken, isEmployee, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.sendStatus(401);

        // Get current month stats range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // 1. Fetch History (Limit 50 descending)
        const historyQuery = `
            SELECT id, to_char(date, 'YYYY-MM-DD') as date_str, status, check_in_time, check_out_time
            FROM attendance
            WHERE user_id = $1
            ORDER BY date DESC
            LIMIT 50
        `;
        const historyRes = await pool.query(historyQuery, [userId]);

        // 2. Stats Query (Current Month)
        const statsQuery = `
            SELECT
                COUNT(*) FILTER (WHERE date >= $2 AND date <= $3) as total_days,
                COUNT(*) FILTER (WHERE date >= $2 AND date <= $3 AND status IN ('Present', 'Half Day')) as present_days,
                COUNT(*) FILTER (WHERE date >= $2 AND date <= $3 AND check_in_time > '09:15:00') as late_days
            FROM attendance
            WHERE user_id = $1
        `;
        const statsRes = await pool.query(statsQuery, [userId, startOfMonth, endOfMonth]);
        const stats = statsRes.rows[0];

        // 3. Leaves Logic (Current Month Approved Leaves)
        const leavesQuery = `
            SELECT COUNT(*) as leaves_taken
            FROM leaves
            WHERE user_id = $1
            AND status = 'Approved'
            AND (start_date <= $3 AND end_date >= $2)
        `;
        const leavesRes = await pool.query(leavesQuery, [userId, startOfMonth, endOfMonth]);
        const leavesTaken = parseInt(leavesRes.rows[0].leaves_taken || '0', 10);


        // --- Helper Functions ---
        const formatTime12h = (timeStr: string | null) => {
            if (!timeStr) return "--";
            // Check if it's "HH:MM:SS"
            const [h, m] = timeStr.split(':').map(Number);
            if (isNaN(h)) return timeStr; // Fallback
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const calculateTotalHours = (startStr: string | null, endStr: string | null) => {
            if (!startStr || !endStr) return "0h 00m";
            const [h1, m1] = startStr.split(':').map(Number);
            const [h2, m2] = endStr.split(':').map(Number);

            let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diffMins < 0) diffMins = 0; // Should not happen for normal shifts

            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            return `${h}h ${m.toString().padStart(2, '0')}m`;
        };

        const formatDateStr = (dateObj: Date) => {
            // Ensure YYYY-MM-DD format from Date object
            return dateObj.toISOString().split('T')[0];
        };


        const history = historyRes.rows.map(row => {
            let displayStatus = row.status;

            // Derive "Late" status if Present but checked in after 9:15
            if (row.status === 'Present' && row.check_in_time > '09:15:00') {
                displayStatus = 'Late';
            }

            // Use the string directly from DB to avoid timezone shifts
            const dateStr = row.date_str;

            // Treat as UTC (Appends Z) so frontend converts to Local
            const checkInISO = row.check_in_time ? `${dateStr}T${row.check_in_time}Z` : null;
            const checkOutISO = row.check_out_time ? `${dateStr}T${row.check_out_time}Z` : null;

            return {
                id: row.id,
                date: dateStr,
                checkIn: checkInISO,
                checkOut: checkOutISO,
                totalHours: calculateTotalHours(row.check_in_time, row.check_out_time),
                status: displayStatus
            };
        });

        res.json({
            history,
            stats: {
                totalWorkingDays: parseInt(stats.total_days || '0'),
                presentDays: parseInt(stats.present_days || '0'),
                lateArrivals: parseInt(stats.late_days || '0'),
                leavesTaken: leavesTaken
            }
        });

    } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
