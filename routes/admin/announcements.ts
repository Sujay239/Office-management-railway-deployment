import express, { Request, Response } from "express";
import pool from "../../db/db.js";
import { authenticateToken } from "../../middlewares/authenticateToken.js";
import isAdmin from "../../middlewares/isAdmin.js";
import { enforce2FA } from "../../middlewares/enforce2FA.js";
import { sendEmail } from "../../utils/mailer.js";
import { announcementEmail } from "../../templates/announcementEmail.js";

const router = express.Router();

// Helper to pause execution (prevents spam flagging)
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

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
          .json({ message: "No active employees found." });
      }

      const htmlContent = announcementEmail(
        subject,
        message,
        priority || "Normal"
      );

      console.log(
        `Sending announcement to ${employees.length} employees (throttled)...`
      );

      // 2. Send Emails Sequentially (Safer for Brevo)
      let successCount = 0;
      let failCount = 0;

      for (const emp of employees) {
        try {
          await sendEmail({
            to: emp.email,
            subject: priority === "High" ? `[URGENT] ${subject}` : subject,
            html: htmlContent,
            text: message,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to send to ${emp.email}`, err);
          failCount++;
        }

        // ⚠️ Wait 200ms between emails to prevent rate-limiting/spam flags
        // 5 employees = 1 second. 100 employees = 20 seconds.
        await delay(200); 
      }

      console.log(
        `Announcement sent. Success: ${successCount}, Failed: ${failCount}`
      );

      // 3. Send Response WITH Stats
      // This matches exactly what your frontend expects
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
