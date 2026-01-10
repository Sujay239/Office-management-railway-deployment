import express, { Request, Response } from 'express';
import pool from '../../db/db.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import isAdmin from '../../middlewares/isAdmin.js';
import { enforce2FA } from '../../middlewares/enforce2FA.js';

const router = express.Router();

router.get('/stats', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        // 1. Total Staff (Active)
        const totalStaffQuery = pool.query(
            "SELECT COUNT(*) FROM users WHERE status = 'Active' and role = 'employee'"
        );

        // 2. Staff Growth (Last 30 Days)
        const staffGrowthQuery = pool.query(
            "SELECT COUNT(*) FROM users WHERE status = 'Active' AND created_at >= NOW() - INTERVAL '30 days' and role = 'employee'"
        );

        // 3. Payroll Cost (Sum of salary for next month projection)
        const payrollCostQuery = pool.query(
            "SELECT SUM(salary) FROM users WHERE status = 'Active' and role = 'employee'"
        );

        // 4. Attendance Today
        const attendanceTodayQuery = pool.query(
            "SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND status = 'Present' and user_id in (SELECT id FROM users WHERE role = 'employee')"
        );

        // 5. Attendance Yesterday
        const attendanceYesterdayQuery = pool.query(
            "SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE - INTERVAL '1 day' AND status = 'Present' and user_id in (SELECT id FROM users WHERE role = 'employee')"
        );

        // 6. Payroll History (Last 6 Months)
        // Join with users table to filter by role = 'employee' match the other stats
        const payrollHistoryQuery = pool.query(
            `SELECT p.month, SUM(p.net_salary) as total_payout
             FROM payroll p
             JOIN users u ON p.user_id = u.id
             WHERE p.status = 'paid' AND u.role = 'employee'
             GROUP BY p.month
             ORDER BY MAX(p.created_at) DESC
             LIMIT 6`
        );

        // 7. Pending Leaves (Actionable)
        const pendingLeavesQuery = pool.query(`
            SELECT l.id, l.type, l.start_date, l.end_date, l.reason, u.name, u.designation, u.avatar_url
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE l.status = 'Pending'
            ORDER BY l.created_at DESC
            LIMIT 5
        `);

        // 8. Upcoming Holidays
        const upcomingHolidaysQuery = pool.query(
            "SELECT * FROM holidays WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 4"
        );

        const [
            totalStaffRes,
            staffGrowthRes,
            payrollCostRes,
            attendanceTodayRes,
            attendanceYesterdayRes,
            payrollHistoryRes,
            pendingLeavesRes,
            upcomingHolidaysRes
        ] = await Promise.all([
            totalStaffQuery,
            staffGrowthQuery,
            payrollCostQuery,
            attendanceTodayQuery,
            attendanceYesterdayQuery,
            payrollHistoryQuery,
            pendingLeavesQuery,
            upcomingHolidaysQuery
        ]);

        const totalStaff = parseInt(totalStaffRes.rows[0].count, 10);
        const newStaff = parseInt(staffGrowthRes.rows[0].count, 10); // Growth count
        // Calculate growth percentage conservatively (if no staff before, it's 100% or just count)
        const growthPercentage = totalStaff > 0 ? ((newStaff / (totalStaff - newStaff || 1)) * 100).toFixed(1) : 0;

        const payrollCost = parseFloat(payrollCostRes.rows[0].sum || '0');

        const presentToday = parseInt(attendanceTodayRes.rows[0].count, 10);
        const presentYesterday = parseInt(attendanceYesterdayRes.rows[0].count, 10);

        // Attendance Percentage (Present / Total Active)
        const attendancePercentage = totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0;
        const attendanceYesterdayPercentage = totalStaff > 0 ? Math.round((presentYesterday / totalStaff) * 100) : 0;
        const attendanceChange = attendancePercentage - attendanceYesterdayPercentage;

        // Simplify Payroll History for Chart
        // Ensure chronological order (reverse the DESC result)
        const payrollHistory = payrollHistoryRes.rows.reverse().map((row: any) => ({
            month: row.month.split(' ')[0].substring(0, 3) + ' ' + row.month.split(' ')[1].slice(-2), // e.g. "Jan 24"
            full_month: row.month,
            amount: parseFloat(row.total_payout || '0')
        }));


        res.json({
            total_employees: totalStaff,
            employee_growth: `${newStaff > 0 ? '+' : ''}${growthPercentage}%`,
            payroll_cost: payrollCost,
            attendance_percentage: attendancePercentage,
            attendance_change: attendanceChange,
            payroll_history: payrollHistory,
            pending_leaves: pendingLeavesRes.rows,
            upcoming_holidays: upcomingHolidaysRes.rows
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
