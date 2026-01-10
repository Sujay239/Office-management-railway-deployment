import express, { Request, Response } from "express";
import pool from "../../db/db";
import { authenticateToken } from "../../middlewares/authenticateToken";
import isAdmin from "../../middlewares/isAdmin";
import { enforce2FA } from "../../middlewares/enforce2FA";
import { sendEmail } from "../../utils/mailer";
import { announcementEmail } from "../../templates/announcementEmail";

const router = express.Router();

router.post(
  "/send",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const { subject, message, priority } = req.body;

      if (!subject || !message) {
        return res
          .status(400)
          .json({ message: "Subject and message are required." });
      }

      const result = await pool.query(
        "SELECT email, name FROM users WHERE role = 'employee'"
      );
      const employees = result.rows;

      if (employees.length === 0) {
        return res
          .status(404)
          .json({ message: "No employees found to send announcement to." });
      }

      const htmlContent = announcementEmail(
        subject,
        message,
        priority || "Normal"
      );

      // Respond immediately
      res.status(200).json({
        message: "Announcement broadcast started in the background.",
        totalRecipients: employees.length,
      });

      // Background processing
      console.log(
        `Starting announcement broadcast to ${employees.length} employees...`
      );

      (async () => {
        const emailPromises = employees.map((emp) =>
          sendEmail({
            to: emp.email,
            subject: priority === "High" ? `[URGENT] ${subject}` : subject,
            html: htmlContent,
            text: message, // Fallback plain text
          })
        );

        const results = await Promise.allSettled(emailPromises);

        const successCount = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failCount = results.filter((r) => r.status === "rejected").length;

        console.log(
          `Announcement sent. Success: ${successCount}, Failed: ${failCount}`
        );
      })();
    } catch (error) {
      console.error("Error sending announcement:", error);
      res
        .status(500)
        .json({ message: "Internal server error processing announcements." });
    }
  }
);

export default router;
