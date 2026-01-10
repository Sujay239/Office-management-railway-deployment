import express, { Request, Response } from "express";
import pool from "../../db/db";
import crypto from "crypto";
import { sendEmail } from "../../utils/mailer";
import getResetPasswordHtml from "../../templates/resetPasswordEmail";
import hashPassword from "../../utils/hashPassword";

const router = express.Router();

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const BASE_URL = process.env.CLIENT_URL;
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const token = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await pool.query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3",
      [token, expiresAt, email]
    );

    res.json({ message: "Password reset email sent" });

    // Send Email in background
    sendEmail({
      to: email,
      subject: "Reset Password",
      html: getResetPasswordHtml(`${BASE_URL}/reset-password?token=${token}`),
    }).catch((error) =>
      console.error("Error sending password reset email in background:", error)
    );
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE reset_password_token = $1",
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = userResult.rows[0];
    const now = new Date();

    if (new Date(user.reset_password_expires) < now) {
      return res.status(400).json({ message: "Token has expired" });
    }

    const hashedPassword = await hashPassword(password);

    await pool.query(
      "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
      [hashedPassword, user.id]
    );

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
