// import express, { Request, Response } from 'express';
// import pool from '../db/db';
// const router = express.Router();


// router.post('/delete', async (req : Request, res : Response) => {
//     try {
//         const result = await pool.query('DELETE FROM users WHERE role = $1', ['employee']);
//         res.json({ message: 'All users deleted successfully' });
//     } catch (error) {
//         console.error('Error deleting users:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

// router.get('/setup-users-table', async (req : Request, res : Response) => {
//     try {
//         // This SQL command adds the token column and the expiration column
//         const sql = `
//       ALTER TABLE users
//       ADD COLUMN reset_password_token VARCHAR(255) default null,
//       ADD COLUMN reset_password_expires TIMESTAMP default null,
//       ADD COLUMN two_factor_secret VARCHAR(255) default null,
//       ADD COLUMN two_factor_enabled BOOLEAN default false
//     `;

//         // Execute the query
//         await pool.query(sql);

//         res.send('Success: Users table altered. Columns added.');
//     } catch (error) {
//         // This catches errors, like if the columns already exist
//         console.error(error);
//         res.status(500).send('Error altering table: ' + error);
//     }
// });

// export default router;
