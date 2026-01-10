import express, { Request, Response } from "express";
import pool from "../../db/db";
import { authenticateToken } from "../../middlewares/authenticateToken";
import isEmployee from "../../middlewares/isEmployee";

const router = express.Router();

// Helper to handle Capitalization and your specific DB typo
const normalizeTypeForDB = (type: string) => {
    const lower = type.toLowerCase();
    if (lower === 'privilege') return 'Previlage'; // Matches your DB Enum typo
    // Capitalize first letter: "casual" -> "Casual"
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// --- Apply for Leave ---
router.post('/apply', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    const { type, start_date, end_date, reason } = req.body;
    const emp_id = (req as any).user.id;

    if (!type || !start_date || !end_date || !reason) {
        return res.status(400).json({ error: "All fields are required." });
    }

    // 1. Fix the type format before sending to DB
    const dbLeaveType = normalizeTypeForDB(type);

    try {
        const query = `
            INSERT INTO leaves (user_id, type, start_date, end_date, reason)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [emp_id, dbLeaveType, start_date, end_date, reason];

        const result = await pool.query(query, values);

        res.status(201).json({
            message: "Leave application submitted successfully",
            leave: result.rows[0]
        });

    } catch (err: any) {
        console.error("Error applying for leave:", err.message);

        // Handle Enum violation specifically
        if (err.code === '22P02' || err.message.includes('invalid input value for enum')) {
            return res.status(400).json({ error: `Invalid leave type. Database expects: Sick, Casual, or Previlage` });
        }

        if (err.code === '23505') {
            return res.status(409).json({ error: "Leave request already exists for these dates." });
        }

        res.status(500).json({ error: 'Failed to apply for leave.' });
    }
});


// --- Get Leave Summary ---
router.get('/summary', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const year = new Date().getFullYear();

        // 1. Fetch used leaves
        // We cast type::text to ensure we get a string back, not an enum reference
        const usedQuery = `
            SELECT type::text, SUM(end_date - start_date + 1) as used
            FROM leaves
            WHERE user_id = $1
            AND status = 'Approved' -- Ensure this matches your DB status (Case Sensitive)
            AND EXTRACT(YEAR FROM start_date) = $2
            GROUP BY type
        `;
        const result = await pool.query(usedQuery, [userId, year]);

        // 2. Map DB results to lowercase keys for frontend
        const usedMap: Record<string, number> = {};

        result.rows.forEach((row: any) => {
            let key = row.type.toLowerCase();
            // Fix the specific typo mapping so it matches the entitlements array below
            if (key === 'previlage') key = 'privilege';

            usedMap[key] = parseInt(row.used) || 0;
        });

        // 3. Define Entitlements (Frontend expects these lowercase keys)
        const entitlements = [
            { type: "sick", label: "Sick Leave", total: 10, color: "text-red-600 bg-red-50" },
            { type: "casual", label: "Casual Leave", total: 12, color: "text-amber-600 bg-amber-50" },
            { type: "privilege", label: "Privilege Leave", total: 15, color: "text-blue-600 bg-blue-50" }
        ];

        // 4. Calculate final balances
        const balances = entitlements.map(e => ({
            ...e,
            used: usedMap[e.type] || 0,
            available: e.total - (usedMap[e.type] || 0)
        }));

        res.json(balances);

    } catch (err: any) {
        console.error("Error fetching leave summary:", err.message);
        res.status(500).json({ error: "Failed to fetch leave summary" });
    }
});

// --- Get All Leaves ---
router.get('/all', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const query = `
            SELECT
                l.id,
                u.name,
                l.type,
                l.start_date,
                l.end_date,
                TO_CHAR(l.start_date, 'Mon DD') || ' - ' || TO_CHAR(l.end_date, 'Mon DD') AS dates,
                (l.end_date - l.start_date) + 1 AS days,
                l.reason,
                INITCAP(l.status::text) AS status, -- Normalizes 'approved' -> 'Approved'
                COALESCE(u.avatar_url, '') AS avatar
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE l.user_id = $1
            ORDER BY l.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err: any) {
        console.error("Error fetching leaves:", err.message);
        res.status(500).json({ error: 'Failed to fetch leaves.' });
    }
});

export default router;
