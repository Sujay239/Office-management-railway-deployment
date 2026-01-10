import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import decodeToken from '../../utils/decodeToken';
import isEmployee from '../../middlewares/isEmployee';

const router = express.Router();

router.get('/stats', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.token;
        const data: any = await decodeToken(token);
        const userId = data.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const tasksQuery = `
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status != 'Completed' THEN 1 END) as pending
            FROM tasks
            WHERE assigned_to = $1
        `;
        const tasksRes = await pool.query(tasksQuery, [userId]);
        const taskStats = tasksRes.rows[0];

        const attendanceQuery = `
            SELECT COUNT(*) as days_present
            FROM attendance
            WHERE user_id = $1
            AND date >= $2
            AND status IN ('Present', 'Half Day')
            `;
        const attendanceRes = await pool.query(attendanceQuery, [userId, startOfMonth]);
        const daysPresent = parseInt(attendanceRes.rows[0].days_present || '0');

        const daysInMonthSoFar = now.getDate();
        const attendancePercentage = daysInMonthSoFar > 0 ? Math.round((daysPresent / daysInMonthSoFar) * 100) : 0;


        // 1. Get Upcoming/Active Meetings (Limit 3)
        const upcomingQuery = `
            SELECT id, title, start_time, end_time, join_url, 'Meeting' as type
            FROM meetings
            WHERE $1 = ANY(user_id)
            AND start_time::date = CURRENT_DATE
            AND end_time >= $2
            ORDER BY start_time ASC
            LIMIT 3
            `;
        const upcomingRes = await pool.query(upcomingQuery, [userId, now]);
        let todaysSchedule = upcomingRes.rows;

        // 2. If we have space, get Ended Meetings
        if (todaysSchedule.length < 3) {
            const limit = 3 - todaysSchedule.length;
            const endedQuery = `
                SELECT id, title, start_time, end_time, join_url, 'Meeting' as type
                FROM meetings
                WHERE $1 = ANY(user_id)
                AND start_time::date = CURRENT_DATE
                AND end_time < $2
                ORDER BY start_time ASC
                LIMIT $3
            `;
            const endedRes = await pool.query(endedQuery, [userId, now, limit]);
            todaysSchedule = [...todaysSchedule, ...endedRes.rows];
        }



        const recentTasksQuery = `
            SELECT title as description, 'New Assignment' as title, created_at, 'task' as type
            FROM tasks
            WHERE assigned_to = $1
            ORDER BY created_at DESC
            LIMIT 5
            `;

        const recentMeetingsQuery = `
            SELECT title as description, 'Meeting Invite' as title, created_at, 'meeting' as type
            FROM meetings
            WHERE $1 = ANY(user_id)
            ORDER BY created_at DESC
            LIMIT 5
            `;

        const [recentTasks, recentMeetings] = await Promise.all([
            pool.query(recentTasksQuery, [userId]),
            pool.query(recentMeetingsQuery, [userId])
        ]);

        const combinedActivity = [...recentTasks.rows, ...recentMeetings.rows]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);


        res.json({
            stats: {
                totalTasks: parseInt(taskStats.total),
                completedTasks: parseInt(taskStats.completed),
                pendingTasks: parseInt(taskStats.pending),
                attendancePercentage: attendancePercentage > 100 ? 100 : attendancePercentage, // Cap at 100 just in case
                daysPresent
            },
            schedule: todaysSchedule,
            recentActivity: combinedActivity
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});





router.post('/clock-in', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.token;
        const data: any = await decodeToken(token);
        const userId = data.id;
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toISOString().split('T')[1].split('.')[0];

        const status = 'Present';
        const query = `
            INSERT INTO attendance(user_id, date, status, check_in_time)
            VALUES($1, $2, $3, $4)
            RETURNING id, check_in_time,check_out_time;
        `;

        const result = await pool.query(query, [userId, currentDate, status, currentTime]);

        return res.status(201).json({
            message: 'Clock-in successful',
            checkIn: result.rows[0].check_in_time,
            checkOut: result.rows[0].check_out_time
        });

    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Already clocked in or finished shift for today' });
        }

        console.error('Error clocking in:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/clock-out', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.token;
        const data: any = await decodeToken(token);
        const now = new Date();
        const currentTime = now.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS (UTC)
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
        const userId = data.id;

        const checkInRes = await pool.query('SELECT check_in_time FROM attendance WHERE user_id = $1 AND date = $2', [userId, currentDate]);
        if (checkInRes.rows.length === 0) {
            return res.status(404).json({ message: 'No clock-in record found for today' });
        }

        const checkInTime = checkInRes.rows[0].check_in_time;
        const [h, m, s] = checkInTime.split(':').map(Number);
        const checkInDate = new Date(now);
        checkInDate.setUTCHours(h, m, s, 0);

        const workingHours = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
        const status = workingHours < 7 ? 'Half Day' : 'Present';
        const query = `
            UPDATE attendance
            SET status = $3, check_out_time = $4
            WHERE user_id = $1 AND date = $2
            RETURNING id, check_out_time,check_in_time;
        `;

        const result = await pool.query(query, [userId, currentDate, status, currentTime]);

        return res.status(201).json({
            message: 'Clock-out successful',
            checkIn: result.rows[0].check_in_time,
            checkOut: result.rows[0].check_out_time
        });

    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Already clocked out for today' });
        }

        console.error('Error clocking out:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


router.get('/meetings', authenticateToken, isEmployee, async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.token;
        const data: any = await decodeToken(token);
        const userId = data.id;

        const meetingsQuery = `
            SELECT id, title, start_time, end_time, join_url, description, user_id
            FROM meetings
            WHERE $1 = ANY(user_id)
            ORDER BY start_time DESC
        `;
        const result = await pool.query(meetingsQuery, [userId]);

        res.json({ meetings: result.rows });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
