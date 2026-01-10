// import express, { Request, Response } from 'express';
// import pool from '../db/db';
// const router = express.Router();


// router.post('/delete', async (req : Request, res : Response) => {
//     try {
//         const result = await pool.query('DELETE FROM past_employees');
//         res.json({ message: 'All users deleted successfully from past_employees table' , result });
//     } catch (error) {
//         console.error('Error deleting users:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

// export default router;
