import express, { Request, Response } from "express";
import pool from "../../db/db.js";
import { authenticateToken } from "../../middlewares/authenticateToken.js";
import isAdmin from "../../middlewares/isAdmin.js";
import { enforce2FA } from "../../middlewares/enforce2FA.js";
import { sendEmail } from "../../utils/mailer.js";
import { announcementEmail } from "../../templates/announcementEmail.js";

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

      // 1. Fetch Employees
      const result = await pool.query(
        "SELECT email, name FROM users WHERE role = 'employee' AND status = 'Active'"
      );
      const employees = result.rows;

      if (employees.length === 0) {
        return res
          .status(404)
          .json({ message: "No active employees found to send announcement to." });
      }

      const htmlContent = announcementEmail(
        subject,
        message,
        priority || "Normal"
      );

      console.log(
        `Sending announcement to ${employees.length} employees...`
      );

      // 2. Send Emails (Wait for completion)
      // We use map to create an array of promises, then await all of them.
      const emailPromises = employees.map((emp) =>
        sendEmail({
          to: emp.email,
          subject: priority === "High" ? `[URGENT] ${subject}` : subject,
          html: htmlContent,
          text: message, // Fallback plain text
        })
      );

      // This waits until ALL emails are processed (success or fail)
      const results = await Promise.allSettled(emailPromises);

      // 3. Calculate Stats
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      console.log(
        `Announcement sent. Success: ${successCount}, Failed: ${failCount}`
      );

      // 4. Send Response WITH Stats
      // Now the frontend will receive the 'stats' object it expects
      return res.status(200).json({
        message: "Announcement broadcast completed.",
        stats: {
          sent: successCount,
          failed: failCount,
        },
      });

    } catch (error) {
      console.error("Error sending announcement:", error);
      return res
        .status(500)
        .json({ message: "Internal server error processing announcements." });
    }
  }
);

export default router;
