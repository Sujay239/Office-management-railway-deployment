import express, { Request, Response } from "express";
import pool from "../../db/db";
import { authenticateToken } from "../../middlewares/authenticateToken";
import isAdmin from "../../middlewares/isAdmin";
import { enforce2FA } from "../../middlewares/enforce2FA";
import { sendEmail } from "../../utils/mailer";
import { logAudit } from "../../utils/auditLogger";
import { taskAssignmentEmail } from "../../templates/taskAssignmentEmail";

const router = express.Router();

// Get all tasks (with assigned user details)
router.get(
  "/all",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const query = `
            SELECT t.*, u.name as assigned_to_name, u.avatar_url as assigned_to_avatar, u.designation as assigned_to_designation
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            ORDER BY t.created_at DESC
        `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Create a new task
router.post(
  "/create",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const { title, project, description, priority, due_date, assigned_to } =
      req.body;
    // @ts-ignore
    const created_by = req.user.id;

    if (!title || !priority || !assigned_to) {
      return res
        .status(400)
        .json({ message: "Title, Priority, and Assigned To are required." });
    }

    try {
      const query = `
            INSERT INTO tasks (title, project, description, priority, due_date, assigned_to, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
      const values = [
        title,
        project,
        description,
        priority,
        due_date,
        assigned_to,
        created_by,
      ];
      const result = await pool.query(query, values);

      // Fetch the created task with user details to return immediately
      const newTaskId = result.rows[0].id;
      // Modified query to also fetch creator name and assignee email
      const fetchQuery = `
             SELECT t.*,
                    u.name as assigned_to_name,
                    u.email as assigned_to_email,
                    u.avatar_url as assigned_to_avatar,
                    u.designation as assigned_to_designation,
                    c.name as created_by_name
             FROM tasks t
             LEFT JOIN users u ON t.assigned_to = u.id
             LEFT JOIN users c ON t.created_by = c.id
             WHERE t.id = $1
        `;
      const finalResult = await pool.query(fetchQuery, [newTaskId]);
      const taskWithDetails = finalResult.rows[0];

      await logAudit(
        // @ts-ignore
        created_by,
        "TASK_ASSIGNED",
        "tasks",
        newTaskId,
        {
          title: taskWithDetails.title,
          assigned_to: taskWithDetails.assigned_to,
        },
        req
      );

      res.status(201).json(taskWithDetails);

      // Send Email Notification in background
      if (taskWithDetails.assigned_to_email) {
        (async () => {
          try {
            const emailHtml = taskAssignmentEmail(
              taskWithDetails.assigned_to_name,
              taskWithDetails.title,
              taskWithDetails.project,
              taskWithDetails.description || "",
              taskWithDetails.priority,
              taskWithDetails.due_date,
              taskWithDetails.created_by_name || "Admin"
            );

            await sendEmail({
              to: taskWithDetails.assigned_to_email,
              subject: `New Task Assigned: ${taskWithDetails.title}`,
              html: emailHtml,
            });
            console.log(
              `Task notification email sent to ${taskWithDetails.assigned_to_email}`
            );
          } catch (emailError) {
            console.error("Failed to send task assignment email:", emailError);
          }
        })();
      }
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete a task
router.delete(
  "/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update a task (Patch)
router.patch(
  "/:id",
  authenticateToken,
  isAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      title,
      project,
      description,
      priority,
      status,
      due_date,
      assigned_to,
    } = req.body;

    try {
      // Build dynamic query
      const fields = [];
      const values = [];
      let idx = 1;

      if (title) {
        fields.push(`title = $${idx++}`);
        values.push(title);
      }
      if (project) {
        fields.push(`project = $${idx++}`);
        values.push(project);
      }
      if (description) {
        fields.push(`description = $${idx++}`);
        values.push(description);
      }
      if (priority) {
        fields.push(`priority = $${idx++}`);
        values.push(priority);
      }
      if (status) {
        fields.push(`status = $${idx++}`);
        values.push(status);
      }
      if (due_date) {
        fields.push(`due_date = $${idx++}`);
        values.push(due_date);
      }
      if (assigned_to) {
        fields.push(`assigned_to = $${idx++}`);
        values.push(assigned_to);
      }

      if (fields.length === 0)
        return res.status(400).json({ message: "No fields to update" });

      values.push(id);
      const query = `UPDATE tasks SET ${fields.join(
        ", "
      )} WHERE id = $${idx} RETURNING *`;

      await pool.query(query, values);

      // Fetch updated with user details
      const fetchQuery = `
             SELECT t.*, u.name as assigned_to_name, u.avatar_url as assigned_to_avatar, u.designation as assigned_to_designation
             FROM tasks t
             LEFT JOIN users u ON t.assigned_to = u.id
             WHERE t.id = $1
        `;
      const finalResult = await pool.query(fetchQuery, [id]);

      res.json(finalResult.rows[0]);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
