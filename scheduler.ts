import cron from 'node-cron';
import pool from './db/db';

export const initScheduler = () => {
    // Run daily at 00:00 (Midnight)
    cron.schedule('0 0 * * *', async () => {
        console.log('Running Daily Auto-Absent Job...');
        try {
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
            console.log(`Daily Auto-Absent Job Completed. Inserted ${result.rowCount} rows.`);
        } catch (err) {
            console.error('Error running daily auto-absent job:', err);
        }
    });

    // Run hourly at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('Running Hourly Audit Log Cleanup...');
        try {
            // Delete logs older than 24 hours
            const query = `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '24 hours'`;
            const result = await pool.query(query);
            console.log(`Hourly Audit Log Cleanup Completed. Deleted ${result.rowCount} rows.`);
        } catch (err) {
            console.error('Error running audit log cleanup:', err);
        }
    });

    console.log('Daily Auto-Absent Scheduler initialized.');
};
