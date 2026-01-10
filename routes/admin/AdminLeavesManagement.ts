import express, { Request, Response } from "express";
import pool from "../../db/db";
import { authenticateToken } from "../../middlewares/authenticateToken";
import isAdmin from "../../middlewares/isAdmin";
import { enforce2FA } from "../../middlewares/enforce2FA";
import { logAudit } from "../../utils/auditLogger";

const router = express.Router();

router.get(
  "/all",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const query = `
            SELECT
                l.id,
                u.name,
                l.type,
                l.start_date,
                TO_CHAR(l.start_date, 'Mon DD') || ' - ' || TO_CHAR(l.end_date, 'Mon DD') AS dates,
                (l.end_date - l.start_date) + 1 AS days,
                l.reason,
                INITCAP(l.status::text) AS status,
                COALESCE(u.avatar_url, '') AS avatar
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
        `;

      const result = await pool.query(query);

      res.json(result.rows);
    } catch (err: any) {
      console.error("Error fetching leaves:", err.message);
      res
        .status(500)
        .json({ error: "Failed to fetch leaves. Please try again later." });
    }
  }
);

router.put(
  "/approve/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Leave ID is required." });
      }

      await client.query("BEGIN");

      // 1. Update Leave Status
      const updateQuery = `
            UPDATE leaves
            SET status = 'Approved'
            WHERE id = $1
            RETURNING *
        `;
      const result = await client.query(updateQuery, [parseInt(id)]);

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Leave request not found." });
      }

      const leave = result.rows[0];

      await logAudit(
        // @ts-ignore
        req.user?.id,
        "LEAVE_APPROVED",
        "leaves",
        leave.id,
        { user_id: leave.user_id, status: "Approved" },
        req
      );

      // 2. Insert/Update Attendance Records for the date range
      // We use generate_series to create the dates and ON CONFLICT to update if exists
      const attendanceQuery = `
            INSERT INTO attendance (user_id, date, status)
            SELECT $1, d::date, 'On Leave'
            FROM generate_series($2::date, $3::date, '1 day'::interval) d
            ON CONFLICT (user_id, date)
            DO UPDATE SET status = 'On Leave';
        `;

      await client.query(attendanceQuery, [
        leave.user_id,
        leave.start_date,
        leave.end_date,
      ]);

      await client.query("COMMIT");

      res.json({
        message: "Leave approved and attendance updated successfully",
        leave: leave,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("Error approving leave:", err.message);
      res
        .status(500)
        .json({ error: "Failed to approve leave. Please try again later." });
    } finally {
      client.release();
    }
  }
);

router.put(
  "/reject/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Leave ID is required." });
      }

      await client.query("BEGIN");

      // 1. Update Leave Status
      const updateQuery = `
            UPDATE leaves
            SET status = 'Rejected'
            WHERE id = $1
            RETURNING *
        `;
      const result = await client.query(updateQuery, [parseInt(id)]);

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Leave request not found." });
      }

      const leave = result.rows[0];

      // 2. Delete Attendance Records if they exist for this range
      const deleteAttendanceQuery = `
            DELETE FROM attendance
            WHERE user_id = $1
            AND date >= $2
            AND date <= $3
        `;

      await client.query(deleteAttendanceQuery, [
        leave.user_id,
        leave.start_date,
        leave.end_date,
      ]);

      await client.query("COMMIT");

      res.json({
        message: "Leave rejected and attendance cleared successfully",
        leave: leave,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("Error rejecting leave:", err.message);
      res
        .status(500)
        .json({ error: "Failed to reject leave. Please try again later." });
    } finally {
      client.release();
    }
  }
);

export default router;
