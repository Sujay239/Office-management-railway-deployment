import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import isSuperAdmin from '../../middlewares/isSuperAdmin';
import { enforce2FA } from '../../middlewares/enforce2FA';

const router = express.Router();

// Get all departments with manager details and staff count
import isAdmin from '../../middlewares/isAdmin'; // Import isAdmin

router.get('/getAll', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT
                d.id,
                d.name,
                d.description,
                d.manager_id,
                u.name as manager_name,
                (SELECT COUNT(*) FROM users WHERE department_id = d.id) as staff_count,
                d.created_at
            FROM departments d
            LEFT JOIN users u ON d.manager_id = u.id
            ORDER BY d.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single department with staff details
router.get('/get/:id', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT
                d.id,
                d.name,
                d.description,
                d.manager_id,
                u.name as manager_name,
                d.created_at
            FROM departments d
            LEFT JOIN users u ON d.manager_id = u.id
            WHERE d.id = $1
        `;
        const depResult = await pool.query(query, [id]);

        if (depResult.rows.length === 0) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const department = depResult.rows[0];

        // Fetch staff
        const staffQuery = `
            SELECT id, name, email, designation, avatar_url, phone
            FROM users
            WHERE department_id = $1
            ORDER BY name ASC
        `;
        const staffResult = await pool.query(staffQuery, [id]);

        res.json({
            ...department,
            staff: staffResult.rows
        });
    } catch (error) {
        console.error('Error fetching department details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add new department
router.post('/add', authenticateToken, isSuperAdmin, enforce2FA, async (req: Request, res: Response) => {
    const { name, description, manager_id } = req.body;
    try {
        // Check if name exists
        const check = await pool.query('SELECT * FROM departments WHERE name = $1', [name]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Department name already exists' });
        }

        const query = `
            INSERT INTO departments (name, description, manager_id)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, manager_id || null]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding department:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update department
router.put('/update/:id', authenticateToken, isSuperAdmin, enforce2FA, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, manager_id } = req.body;
    try {
        // Check if name exists for other department
        const check = await pool.query('SELECT * FROM departments WHERE name = $1 AND id != $2', [name, id]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Department name already taken' });
        }

        const query = `
            UPDATE departments
            SET name = $1, description = $2, manager_id = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, manager_id || null, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete department
router.delete('/delete/:id', authenticateToken, isSuperAdmin, enforce2FA, async (req: Request, res: Response) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if users are assigned (optional: prevent delete? or allow CASCADE/SET NULL)
        // Schema constraints set manager_id to NULL on delete.
        // But Users.department_id is ON DELETE SET NULL as well.
        // So safe to delete.

        const result = await client.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Department not found' });
        }

        await client.query('COMMIT');
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting department:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Get potential managers (admins + managers)
router.get('/getPotentialManagers', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT id, name, email, role
            FROM users
            WHERE role IN ('admin', 'manager')
            ORDER BY name ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching potential managers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
