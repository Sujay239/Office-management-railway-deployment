import express, { Request, Response } from "express";
import pool from "../../db/db";
import { authenticateToken } from "../../middlewares/authenticateToken";
import isAdmin from "../../middlewares/isAdmin";
import { enforce2FA } from "../../middlewares/enforce2FA";
import { sendEmail } from "../../utils/mailer";
import { payrollSlipEmail } from "../../templates/payrollSlipEmail";

const router = express.Router();

router.get(
  "/all",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      let query =
        "SELECT u.id AS user_id, u.name, u.avatar_url, u.designation, p.id AS payroll_id, p.month, p.basic_salary, p.payment_date, p.status AS payroll_status,p.net_salary,p.allowances,p.deductions,p.payment_date FROM users u INNER JOIN payroll p ON u.id = p.user_id where u.role = 'employee'";

      const result = await pool.query(query);

      if (result.rows.length === 0) {
        return res.status(200).json({ message: "No data found", users: [] });
      }

      res.status(200).json({ users: result.rows });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get(
  "/:month",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const { month } = req.params;
      const year = req.query.year as string;

      if (!month || !year) {
        return res.status(400).json({ error: "Month and Year are required." });
      }

      const query = `
            SELECT
                u.id AS user_id,
                u.name,
                u.avatar_url,
                u.designation,
                p.id AS payroll_id,
                p.basic_salary,
                p.net_salary,
                p.allowances,
                p.deductions,
                p.status AS payroll_status,
                p.month,
                p.payment_date,
                p.created_at
            FROM payroll p
            JOIN users u ON p.user_id = u.id
            WHERE REPLACE(p.month, ' ', '') = $1 || $2 AND u.role = 'employee'
        `;

      const values = [month, parseInt(year)];

      const result = await pool.query(query, values);

      res.status(200).json({ users: result.rows });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Server Error" });
    }
  }
);

router.patch(
  "/process/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "ID is required." });
      }

      const query = `UPDATE payroll SET status = 'processing' WHERE id = $1`;
      const values = [parseInt(id)];
      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Payroll record not found" });
      }

      res.status(200).json({ message: "Payroll status updated successfully" });
    } catch (err: any) {
      console.error("Error updating payroll status:", err.message);
      res.status(500).json({ error: "Server Error" });
    }
  }
);

router.put(
  "/pay/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const basic_salary = parseFloat(req.body.basic_salary) || 0;
      const allowances = parseFloat(req.body.allowances) || 0;
      const deductions = parseFloat(req.body.deductions) || 0;

      console.log(`[DEBUG] PUT /pay/${id} hit. Payload:`, req.body);

      if (!id) {
        return res.status(400).json({ error: "ID is required." });
      }

      await client.query("BEGIN");

      const net_salary = basic_salary + allowances - deductions;

      const query = `
            UPDATE payroll
            SET basic_salary = $1, allowances = $2, deductions = $3, net_salary = $4, status = 'paid', payment_date = $6
            WHERE id = $5
        `;
      const values = [
        basic_salary,
        allowances,
        deductions,
        net_salary,
        parseInt(id),
        new Date(),
      ];

      console.log(`[DEBUG] Executing update for Payroll ID: ${id}`);
      const result = await client.query(query, values);
      console.log(`[DEBUG] Update result rowCount: ${result.rowCount}`);

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Payroll record not found" });
      }

      // Fetch User and Payment Details for Email
      const payrollDetails = await client.query(
        `SELECT u.name, u.email, p.month FROM payroll p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = $1`,
        [parseInt(id)]
      );

      await client.query("COMMIT");

      res.status(200).json({
        message: "Payroll updated successfully",
        data: { net_salary },
      });

      // Send Email in background
      if (payrollDetails.rows.length > 0) {
        const { name, email, month } = payrollDetails.rows[0];

        (async () => {
          try {
            const dashboardLink = `${
              process.env.CLIENT_URL || "http://localhost:5173"
            }/employee/payroll`;
            const emailHtml = payrollSlipEmail(
              name,
              month,
              basic_salary,
              allowances,
              deductions,
              net_salary,
              new Date().toISOString(),
              dashboardLink
            );

            await sendEmail({
              to: email,
              subject: `Payslip for ${month} - Salary Credited 💸`,
              html: emailHtml,
            });
            console.log(`Payslip email sent to ${email}`);
          } catch (emailError) {
            console.error("Failed to send payroll email", emailError);
          }
        })();
      }
    } catch (err: any) {
      console.error("Error updating payroll:", err.message);
      await client.query("ROLLBACK");
      res.status(500).json({ error: "Server Error" });
    } finally {
      client.release();
    }
  }
);

export default router;
