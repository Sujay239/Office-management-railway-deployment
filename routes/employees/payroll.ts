import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import isEmployee from '../../middlewares/isEmployee';

const router = express.Router();

router.get('/history', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // 1. Fetch Salary History (All records for user)
        const historyQuery = `
            SELECT id, month, payment_date, basic_salary, allowances, deductions, net_salary, status, created_at
            FROM payroll
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const historyRes = await pool.query(historyQuery, [userId]);
        const history = historyRes.rows.map(row => ({
            id: row.id,
            month: row.month,
            date: row.payment_date ? new Date(row.payment_date).toLocaleDateString() : 'Pending', // Simple date string for FE
            basicSalary: parseFloat(row.basic_salary),
            allowances: parseFloat(row.allowances),
            deductions: parseFloat(row.deductions),
            netSalary: parseFloat(row.net_salary),
            status: row.status
        }));

        // 2. Fetch Stats
        // Last Month Net Pay (Latest 'paid' record)
        const lastPayQuery = `
            SELECT net_salary
            FROM payroll
            WHERE user_id = $1 AND status = 'paid'
            ORDER BY payment_date DESC
            LIMIT 1
        `;
        const lastPayRes = await pool.query(lastPayQuery, [userId]);
        const lastMonthPay = lastPayRes.rows.length > 0 ? parseFloat(lastPayRes.rows[0].net_salary) : 0;

        // Total Deductions (YTD - Current Year)
        const currentYear = new Date().getFullYear();
        const ytdQuery = `
            SELECT SUM(deductions) as total_deductions
            FROM payroll
            WHERE user_id = $1
            AND status = 'paid'
            AND EXTRACT(YEAR FROM payment_date) = $2
        `;
        const ytdRes = await pool.query(ytdQuery, [userId, currentYear]);
        const ytdDeductions = parseFloat(ytdRes.rows[0].total_deductions || '0');

        res.json({
            stats: {
                lastMonthPay,
                ytdDeductions
            },
            history
        });

    } catch (error) {
        console.error("Error fetching employee payroll:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
