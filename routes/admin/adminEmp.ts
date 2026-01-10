import express, { Request, Response } from "express";
import pool from "../../db/db";
import hashPassword from "../../utils/hashPassword";
import { authenticateToken } from "../../middlewares/authenticateToken";
import isAdmin from "../../middlewares/isAdmin";
import decodeToken from "../../utils/decodeToken";
import matchPassword from "../../utils/matchPassword";
import { enforce2FA } from "../../middlewares/enforce2FA";
import { sendEmail } from "../../utils/mailer";
import { welcomeEmployeeEmail } from "../../templates/welcomeEmployeeEmail";
import { offerLetterTemplate } from "../../templates/offerLetter";
import { generatePdf } from "../../utils/pdfGenerator";
import { logAudit } from "../../utils/auditLogger";

const router = express.Router();

router.post(
  "/addEmp",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const {
      name,
      email,
      designation,
      phone,
      location,
      joining_date,
      salary,
      skills,
      employment_type,
      department_id,
      role // Add this
    } = req.body;



    if (
      !name ||
      !email ||
      !designation ||
      !phone ||
      !location ||
      !joining_date ||
      !salary ||
      !skills ||
      !employment_type ||
      !role // Validate role
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    try {
      const user = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (user.rows.length > 0) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }
      // Generate random 8-character password
      const crypto = await import("crypto");
      const generatedPassword = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();
      const hashedPassword = await hashPassword(generatedPassword);

      // Validate Department Manager Availability
      if (role === "manager" && department_id) {
        const deptCheck = await pool.query(
          "SELECT manager_id, name FROM departments WHERE id = $1",
          [department_id]
        );
        if (deptCheck.rows.length > 0) {
          const { manager_id, name } = deptCheck.rows[0];
          if (manager_id) {
            return res.status(400).json({
              message: `Department '${name}' already has a manager assigned.`,
            });
          }
        }
      }

      const newUser = await pool.query(
        "INSERT INTO users (name, email, password_hash, designation, phone, location, joining_date, salary, skills, employment_type, department_id, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
        [
          name,
          email,
          hashedPassword,
          designation,
          phone,
          location,
          joining_date,
          salary,
          skills,
          employment_type,
          department_id ? department_id : null,
          role,
        ]
      );

      // Auto-assign Manager Logic
      if (role === "manager" && department_id) {
        const deptCheck = await pool.query(
          "SELECT manager_id FROM departments WHERE id = $1",
          [department_id]
        );
        if (deptCheck.rows.length > 0 && !deptCheck.rows[0].manager_id) {
          await pool.query(
            "UPDATE departments SET manager_id = $1 WHERE id = $2",
            [newUser.rows[0].id, department_id]
          );
        }
      }

      // Send response immediately to unblock UI
      res.json({ user: newUser.rows[0] });

      // @ts-ignore
      const adminId = req.user?.id;

      await logAudit(
        adminId,
        'EMPLOYEE_CREATED',
        'users',
        newUser.rows[0].id,
        { name, email, role: newUser.rows[0].role, designation },
        req
      );

      // Send Welcome Email in background
      if (newUser.rows.length > 0) {
        const createdUser = newUser.rows[0];
        // @ts-ignore
        // const adminId = req.user?.id; // This line is now redundant

        (async () => {
          try {
            const adminRes = await pool.query(
              "SELECT name, designation FROM users WHERE id = $1",
              [adminId]
            );
            const adminData = adminRes.rows[0];

            const dashboardLink = `${process.env.CLIENT_URL || "http://localhost:5173"
              }/login`;

            const emailHtml = welcomeEmployeeEmail(
              createdUser.name,
              createdUser.email,
              adminData.name,
              dashboardLink,
              generatedPassword,
              createdUser.designation,
              createdUser.joining_date,
              createdUser.employment_type
            );

            const offerLetterHtml = offerLetterTemplate(
              createdUser.name,
              createdUser.designation,
              createdUser.joining_date,
              String(createdUser.salary),
              adminData.name,
              adminData.designation,
              createdUser.location
            );

            const pdfBuffer = await generatePdf(offerLetterHtml);

            await sendEmail({
              to: createdUser.email,
              subject: "Welcome to the Team of Auto Computation! 🚀",
              html: emailHtml,
              attachments: [
                {
                  filename: "Offer_Letter.pdf",
                  content: pdfBuffer,
                  contentType: "application/pdf",
                },
              ],
            });
            console.log(`Welcome email sent to ${createdUser.email}`);
          } catch (emailError) {
            console.error(
              "Failed to send welcome email/offer letter:",
              emailError
            );
          }
        })();
      }
    } catch (error) {
      console.error("Error adding user:", error);
      // Only send error response if we haven't sent success response yet.
      // Since we moved res.json up, this catch block might catch errors from lines before res.json.
      // errors inside the async background block are caught by its own try/catch.
      if (!res.headersSent) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  }
);

router.put(
  "/updateEmp/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    const { id } = req.params;
    const {
      name,
      email,
      designation,
      phone,
      location,
      joining_date,
      salary,
      skills,
      employment_type,
      department_id,
      role
    } = req.body;

    if (!name || !email || !designation || !phone || !salary) {
      return res.status(400).json({
        message: "Key fields are required for update",
      });
    }

    try {
      await client.query("BEGIN");

      const existingUserResult = await client.query(
        "SELECT salary FROM users WHERE id = $1",
        [id]
      );

      if (existingUserResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Employee not found" });
      }

      const existingSalary = existingUserResult.rows[0].salary;

      const emailCheck = await client.query(
        "SELECT 1 FROM users WHERE email = $1 AND id != $2",
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Email is already in use by another employee",
        });
      }

      // Validate Department Manager Availability
      if (role === "manager" && department_id) {
        const deptCheck = await client.query(
          "SELECT manager_id, name FROM departments WHERE id = $1",
          [department_id]
        );
        if (deptCheck.rows.length > 0) {
          const { manager_id, name } = deptCheck.rows[0];
          // Check if manager exists and IT IS NOT THE CURRENT USER
          if (manager_id && String(manager_id) !== String(id)) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              message: `Department '${name}' already has a manager assigned.`,
            });
          }
        }
      }

      // 3️⃣ Update users table
      const updatedUser = await client.query(
        `UPDATE users
       SET name = $1,
           email = $2,
           designation = $3,
           phone = $4,
           location = $5,
           joining_date = $6,
           salary = $7,
           skills = $8,
           employment_type = $9,
           department_id = $10,
           role = $11
       WHERE id = $12
       RETURNING *`,
        [
          name,
          email,
          designation,
          phone,
          location,
          joining_date,
          salary,
          skills,
          employment_type,
          department_id ? department_id : null,
          role,
          id,
        ]
      );

      // 4️⃣ If salary changed → update payroll
      if (Number(existingSalary) !== Number(salary)) {
        await client.query(
          `UPDATE payroll
         SET basic_salary = $1
         WHERE user_id = $2`,
          [salary, id]
        );
      }

      await client.query("COMMIT");

      // Auto-assign Manager Logic (Outside transaction or inside? Inside is better for consistency but department update is separate concern)
      // Actually, let's do it separately or inside. If inside, we need to be careful.
      // Let's do it inside before COMMIT.
      const updatedUserData = updatedUser.rows[0];
      if (role === "manager" && department_id) {
        const deptCheck = await pool.query("SELECT manager_id FROM departments WHERE id = $1", [department_id]);
        if (deptCheck.rows.length > 0 && !deptCheck.rows[0].manager_id) {
          await pool.query("UPDATE departments SET manager_id = $1 WHERE id = $2", [updatedUserData.id, department_id]);
        }
      }
      // Wait, I mixed pool and client. If I use pool here, it's outside the transaction 'client'.
      // But I am committing right above.
      // Let's rewrite:
      /*
        await client.query("COMMIT");
        if (role === "manager" ...) { use pool }
      */
      // This is fine. The user update is committed. The department update follows.

      res.json({
        message: "Employee updated successfully",
        user: updatedUser.rows[0],
        salaryUpdatedInPayroll: Number(existingSalary) !== Number(salary),
      });

      await logAudit(
        // @ts-ignore
        req.user?.id,
        'EMPLOYEE_UPDATED',
        'users',
        updatedUser.rows[0].id,
        { updatedFields: Object.keys(req.body) },
        req
      );


    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

router.get(
  "/all",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const queryText = `
            SELECT
                id, name, email, role, designation,
                phone, location, joining_date, salary,
                skills, employment_type, status, avatar_url,
                department_id
            FROM users
            WHERE role IN ('employee', 'manager', 'hr')
            ORDER BY created_at DESC
        `;

      const result = await pool.query(queryText);
      if (result.rows.length === 0) {
        return res.status(200).json({ users: [] });
      }

      res.status(200).json({ users: result.rows });
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Remove Employee
router.post(
  "/removeEmp/:id",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, password } = req.body;
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const adminData: any = await decodeToken(token);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 3. Fetch the user first (Use 'client', not 'pool')
      const userRes = await client.query("SELECT * FROM users WHERE id = $1", [
        id,
      ]);

      if (userRes.rows.length === 0) {
        await client.query("ROLLBACK"); // Cancel transaction
        return res.status(404).json({ message: "Employee not found" });
      }

      const admin = await client.query("SELECT * FROM users WHERE id = $1", [
        adminData.id,
      ]);
      if (admin.rows.length === 0) {
        await client.query("ROLLBACK"); // Cancel transaction
        return res.status(404).json({ message: "Admin not found" });
      }

      const adminPasswordMatched = await matchPassword(
        password,
        admin.rows[0].password_hash
      );
      if (!adminPasswordMatched) {
        await client.query("ROLLBACK"); // Cancel transaction
        return res.status(401).json({ message: "Invalid password" });
      }

      const user = userRes.rows[0];

      // 4. Insert into History (past_employees)
      // Note: We map user.id to original_user_id to keep a reference
      const insertQuery = `
      INSERT INTO past_employees
      (original_user_id, name, email, designation, phone, location, joining_date, skills, employment_type, reason_for_exit, removed_by_admin_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

      await client.query(insertQuery, [
        user.id,
        user.name,
        user.email,
        user.designation,
        user.phone,
        user.location,
        user.joining_date,
        user.skills,
        user.employment_type,
        reason || "Not specified",
        adminData.id,
      ]);

      // 5. Delete from users table
      await client.query("DELETE FROM users WHERE id = $1", [id]);

      // 6. Commit the changes (Save everything)
      await client.query("COMMIT");

      res.json({
        message: "Employee removed and archived successfully",
        removedUser: user.name,
      });

      await logAudit(
        adminData.id,
        'EMPLOYEE_REMOVED',
        'users',
        user.id, // Keep ID for reference
        {
          name: user.name,
          reason: reason || "Not specified",
          archived_as: "past_employee"
        },
        req
      );


    } catch (error) {
      // 7. Rollback (Undo everything if ANY step failed)
      await client.query("ROLLBACK");
      console.error("Error performing transaction:", error);
      res
        .status(500)
        .json({ message: "Transaction failed. No changes were made." });
    } finally {
      client.release();
    }
  }
);

//getting all past emp
router.get(
  "/allPastEmp",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const queryText = `
            SELECT
                id,
                original_user_id,
                name,
                email,
                designation,
                phone,
                location,
                skills,
                employment_type,
                joining_date,
                exit_date,
                reason_for_exit,
                removed_by_admin_id
            FROM past_employees
            ORDER BY exit_date DESC
        `;

      const result = await pool.query(queryText);

      if (result.rows.length === 0) {
        return res.status(200).json({ users: [] });
      }

      res.status(200).json({ users: result.rows });
    } catch (error) {
      console.error("Error fetching past employees:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

//Only for meeting purposes
router.get(
  "/all/meetings",
  authenticateToken,
  isAdmin,
  enforce2FA,
  async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const adminData: any = await decodeToken(token);
      const queryText = `
            SELECT
                u.id, u.name, u.email, u.role, u.designation,
                u.phone, u.location, u.joining_date, u.salary,
                u.skills, u.employment_type, u.status, u.avatar_url,
                d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id != $1
        `;

      const result = await pool.query(queryText, [adminData.id]);
      if (result.rows.length === 0) {
        return res.status(200).json({ users: [] });
      }

      res.status(200).json({ users: result.rows });
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
