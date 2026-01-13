import express, { Request, Response } from "express";
import pool from "../../db/db.js";
import { authenticateToken } from "../../middlewares/authenticateToken.js";
import isAdmin from "../../middlewares/isAdmin.js";

const router = express.Router();

// Helper to format time (HH:MM:SS or ISO -> 12h format)
const formatTime = (timeInput: string | Date | null, dateStr?: string) => {
  if (!timeInput) return "-";

  try {
    // If it's a Date object
    if (timeInput instanceof Date) {
      return timeInput.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    const timeStr = String(timeInput);

    // If it's an ISO string (contains 'T'), parse as Date
    if (timeStr.includes("T")) {
      const dateObj = new Date(timeStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    }

    // Handle "HH:MM:SS" string (Postgres TIME type is UTC)
    if (dateStr) {
      // Construct ISO UTC string
      const utcDateStr = `${dateStr}T${timeStr}Z`;
      const dateObj = new Date(utcDateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    }

    // Fallback for "HH:MM:SS" without date (Naive formatting, no timezone adjustment)
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;

    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch (e) {
    return String(timeInput);
  }
};

// Helper to calculate total hours
const calculateTotalHours = (
  startInput: string | Date | null,
  endInput: string | Date | null
) => {
  if (!startInput || !endInput) return "0h 00m";

  try {
    let h1, m1, h2, m2;

    // If Date objects or ISO strings (timestamps)
    if (
      (startInput instanceof Date || String(startInput).includes("T")) &&
      (endInput instanceof Date || String(endInput).includes("T"))
    ) {
      const startDate = new Date(startInput);
      const endDate = new Date(endInput);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "-";

      const diffMs = endDate.getTime() - startDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 0) return "0h 00m";

      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      return `${h}h ${m.toString().padStart(2, "0")}m`;
    }

    // Fallback for TIME strings "HH:MM:SS"
    [h1, m1] = String(startInput).split(":").map(Number);
    [h2, m2] = String(endInput).split(":").map(Number);

    let diffMins = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diffMins < 0) diffMins += 24 * 60; // Handle overnight for simple time strings

    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  } catch (e) {
    return "-";
  }
};

// Get Attendance Data (Daily or History)
router.get(
  "/",
  authenticateToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { mode, date, month, year } = req.query;

      if (mode === "daily") {
        if (!date) {
          return res
            .status(400)
            .json({ message: "Date is required for daily mode" });
        }

        // Fetch all active employees and their attendance for the specific date
        const query = `
                SELECT
                    u.id as user_id,
                    u.name,
                    u.avatar_url,
                    u.designation,
                    COALESCE(a.status, 'Absent') as status,
                    a.check_in_time,
                    a.check_out_time,
                    a.id as attendance_id
                FROM users u
                LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
                WHERE u.role != 'admin' AND u.status = 'Active'
                ORDER BY u.name ASC
            `;

        const result = await pool.query(query, [date]);

        // Format data for frontend
        // We pass 'date' as string (from query) to formatTime to enable UTC conversion
        const formattedData = result.rows.map((row) => ({
          id: row.user_id,
          attendanceId: row.attendance_id,
          name: row.name,
          avatar: row.avatar_url,
          designation: row.designation,
          date: date,
          checkIn: row.check_in_time
            ? formatTime(row.check_in_time, String(date))
            : "-",
          checkOut: row.check_out_time
            ? formatTime(row.check_out_time, String(date))
            : "-",
          hours: calculateTotalHours(row.check_in_time, row.check_out_time),
          status: row.status,
        }));

        // Check for Holiday & Sunday
        const queryDate = new Date(date as string);
        const isSunday = queryDate.getDay() === 0;

        const holidayQuery = `SELECT name FROM holidays WHERE date = $1 LIMIT 1`;
        const holidayResult = await pool.query(holidayQuery, [date]);
        const holidayName =
          holidayResult.rows.length > 0 ? holidayResult.rows[0].name : null;

        return res.json({
          attendanceData: formattedData,
          holidayStatus: {
            isHoliday: !!holidayName,
            name: holidayName,
            isSunday: isSunday,
          },
        });
      } else if (mode === "history") {
        if (!month || !year) {
          return res
            .status(400)
            .json({ message: "Month and Year are required for history mode" });
        }

        // Fetch attendance logs for the specific month and year
        const query = `
                SELECT
                    a.id,
                    to_char(a.date, 'YYYY-MM-DD') as date_str,
                    a.status,
                    a.check_in_time,
                    a.check_out_time,
                    u.name,
                    u.email,
                    u.avatar_url,
                    u.designation
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE EXTRACT(MONTH FROM a.date) = $1
                  AND EXTRACT(YEAR FROM a.date) = $2
                ORDER BY a.date DESC, a.check_in_time DESC
            `;

        const result = await pool.query(query, [month, year]);

        const formattedData = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          avatar: row.avatar_url,
          designation: row.designation,
          date: row.date_str,
          checkIn: row.check_in_time
            ? formatTime(row.check_in_time, row.date_str)
            : "-",
          checkOut: row.check_out_time
            ? formatTime(row.check_out_time, row.date_str)
            : "-",
          hours: calculateTotalHours(row.check_in_time, row.check_out_time),
          status: row.status,
        }));

        return res.json(formattedData);
      } else {
        return res
          .status(400)
          .json({ message: "Invalid mode. Use 'daily' or 'history'." });
      }
    } catch (error) {
      console.error("Error fetching admin attendance:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
