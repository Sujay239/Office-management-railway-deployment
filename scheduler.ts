import cron from "node-cron";
import pool from "./db/db.js";

export const initScheduler = () => {
  // Run daily at 23:30: Auto Clock-out & Session Clear for non-admins
  cron.schedule("30 23 * * *", async () => {
    console.log("Running Auto Clock-Out & Session Reset Job...");
    try {
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0]; // YAYYY-MM-DD (UTC)
      const autoClockOutTime = "23:30:00";

      const query = `
        WITH closed_attendance AS (
            UPDATE attendance
            SET check_out_time = $2,
                remarks = CASE
                            WHEN remarks IS NULL OR remarks = '' THEN 'Auto Clock-out'
                            ELSE remarks || ' | Auto Clock-out'
                          END
            WHERE date = $1
              AND check_out_time IS NULL
              AND user_id IN (
                  SELECT id FROM users
                  WHERE role NOT IN ('admin', 'super_admin')
              )
            RETURNING user_id
        )
        UPDATE users
        SET current_session_id = NULL
        WHERE id IN (SELECT user_id FROM closed_attendance)
        RETURNING id;
      `;

      const result = await pool.query(query, [currentDate, autoClockOutTime]);
      console.log(`Auto Clock-Out Job Completed. Sessions cleared: ${result.rowCount}`);
    } catch (err) {
      console.error("Error running auto clock-out job:", err);
    }
  });

  // Run daily at 00:00 (Midnight)
  cron.schedule("0 0 * * *", async () => {
    console.log("Running Daily Auto-Absent Job...");
    try {
      const today = new Date();
      // 1. Check for Sunday (0)
      if (today.getDay() === 0) {
        console.log("Skipping Daily Auto-Absent Job: Today is Sunday.");
        return;
      }

      // 2. Check for Holiday
      const holidayCheckQuery = `SELECT 1 FROM holidays WHERE date = CURRENT_DATE LIMIT 1`;
      const holidayResult = await pool.query(holidayCheckQuery);

      if ((holidayResult.rowCount ?? 0) > 0) {
        console.log("Skipping Daily Auto-Absent Job: Today is a Holiday.");
        return;
      }

      // Logic: Insert 'Absent' for all active users who don't have a record for today.
      // ON CONFLICT (user_id, date) DO NOTHING ensures we don't overwrite existing leaves/attendance.
      const query = `
        INSERT INTO attendance (user_id, date, status, remarks)
        SELECT id, CURRENT_DATE, 'Absent', 'System Auto-marked'
        FROM users
        WHERE status = 'Active'
        ON CONFLICT (user_id, date) DO NOTHING;
      `;

      const result = await pool.query(query);
      console.log(
        `Daily Auto-Absent Job Completed. Inserted ${result.rowCount} rows.`
      );
    } catch (err) {
      console.error("Error running daily auto-absent job:", err);
    }
  });

  // Run hourly at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("Running Hourly Audit Log Cleanup...");
    try {
      // Delete logs older than 24 hours
      const query = `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '24 hours'`;
      const result = await pool.query(query);
      console.log(
        `Hourly Audit Log Cleanup Completed. Deleted ${result.rowCount} rows.`
      );
    } catch (err) {
      console.error("Error running audit log cleanup:", err);
    }
  });

  console.log("Daily Auto-Absent Scheduler initialized.");
};
