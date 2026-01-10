import express, { Request, Response } from "express";
import pool from "../../db/db";
import { authenticateToken } from "../../middlewares/authenticateToken";
import isAdmin from "../../middlewares/isAdmin";
import { enforce2FA } from "../../middlewares/enforce2FA";
import { sendEmail } from "../../utils/mailer";
import { meetingInvitationEmail } from "../../templates/meetingInvitationEmail";

const router = express.Router();

// Create a new meeting
router.post(
  "/create",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const { title, description, start_time, end_time, join_url, user_ids } =
      req.body;

    if (!title || !start_time || !end_time) {
      return res
        .status(400)
        .json({ message: "Title, start time, and end time are required" });
    }

    try {
      const query = `
            INSERT INTO meetings (title, description, start_time, end_time, join_url, user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
      const values = [
        title,
        description,
        start_time,
        end_time,
        join_url,
        user_ids || [],
      ];

      const result = await pool.query(query, values);

      const newMeeting = result.rows[0];

      res
        .status(201)
        .json({
          message: "Meeting scheduled successfully",
          meeting: newMeeting,
        });

      // --- Send Email Notifications in Background ---
      if (user_ids && user_ids.length > 0) {
        // @ts-ignore
        const adminId = (req as any).user.id;

        (async () => {
          try {
            // 1. Get Admin Name
            const adminRes = await pool.query(
              "SELECT name FROM users WHERE id = $1",
              [adminId]
            );
            const adminName = adminRes.rows[0]?.name || "The Administrator";

            // 2. Get Participants
            const participantsRes = await pool.query(
              "SELECT name, email FROM users WHERE id = ANY($1)",
              [user_ids]
            );
            const participants = participantsRes.rows;

            if (participants.length > 0) {
              // 3. Send Emails in Parallel
              const emailPromises = participants.map((p: any) => {
                const htmlContent = meetingInvitationEmail(
                  p.name,
                  adminName,
                  title,
                  description || "",
                  start_time,
                  end_time,
                  join_url || "#"
                );
                return sendEmail({
                  to: p.email,
                  subject: `Meeting Invitation: ${title}`,
                  html: htmlContent,
                });
              });

              // Use allSettled so one failure doesn't block the response
              Promise.allSettled(emailPromises).then((results) => {
                results.forEach((res, idx) => {
                  if (res.status === "rejected") {
                    console.error(
                      `Failed to send email to ${participants[idx].email}:`,
                      res.reason
                    );
                  }
                });
                console.log(
                  `Meeting emails sent. Total: ${emailPromises.length}`
                );
              });
            }
          } catch (err) {
            console.error("Error in background meeting email processing:", err);
          }
        })();
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get all meetings (upcoming/today and past)
router.get(
  "/all",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const query = `
            SELECT * FROM meetings
            ORDER BY start_time ASC
        `;
      const result = await pool.query(query);

      res.status(200).json({ meetings: result.rows });
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete a meeting
router.delete(
  "/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM meetings WHERE id = $1", [id]);
      res.status(200).json({ message: "Meeting cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling meeting:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update a meeting
router.put(
  "/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, start_time, end_time, join_url, user_ids } =
      req.body;

    if (!title || !start_time || !end_time) {
      return res
        .status(400)
        .json({ message: "Title, start time, and end time are required" });
    }

    try {
      // 1. Fetch Existing Meeting to check for new participants
      const existingMeetingRes = await pool.query(
        "SELECT user_id FROM meetings WHERE id = $1",
        [id]
      );
      if (existingMeetingRes.rows.length === 0) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      const existingUserIds: number[] =
        existingMeetingRes.rows[0].user_id || [];

      const updateQuery = `
            UPDATE meetings
            SET title = $1, description = $2, start_time = $3, end_time = $4, join_url = $5, user_id = $6
            WHERE id = $7
            RETURNING *
        `;
      const values = [
        title,
        description,
        start_time,
        end_time,
        join_url,
        user_ids || [],
        id,
      ];

      const result = await pool.query(updateQuery, values);
      const updatedMeeting = result.rows[0];

      // 2. Identify New Participants
      const newUserIds = (user_ids || []).filter(
        (uid: number) => !existingUserIds.includes(uid)
      );

      res
        .status(200)
        .json({
          message: "Meeting updated successfully",
          meeting: updatedMeeting,
        });

      // 3. Send Email Notifications to NEW participants only (Background)
      if (newUserIds.length > 0) {
        // @ts-ignore
        const adminId = (req as any).user.id;

        (async () => {
          try {
            const adminRes = await pool.query(
              "SELECT name FROM users WHERE id = $1",
              [adminId]
            );
            const adminName = adminRes.rows[0]?.name || "The Administrator";

            const participantsRes = await pool.query(
              "SELECT name, email FROM users WHERE id = ANY($1)",
              [newUserIds]
            );
            const participants = participantsRes.rows;

            if (participants.length > 0) {
              const emailPromises = participants.map((p: any) => {
                const htmlContent = meetingInvitationEmail(
                  p.name,
                  adminName,
                  title,
                  description || "",
                  start_time,
                  end_time,
                  join_url || "#"
                );
                return sendEmail({
                  to: p.email,
                  subject: `Meeting Invitation: ${title}`,
                  html: htmlContent,
                });
              });

              Promise.allSettled(emailPromises).then((results) => {
                results.forEach((res, idx) => {
                  if (res.status === "rejected") {
                    console.error(
                      `Failed to send email to ${participants[idx].email}:`,
                      res.reason
                    );
                  }
                });
              });
            }
          } catch (err) {
            console.error(
              "Error in background meeting update email processing:",
              err
            );
          }
        })();
      }
    } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
