// import express from 'express';
// import pool from '../db/db';

// const router = express.Router();

// router.get('/', async (req, res) => {
//     try {
//         const query = `CREATE TABLE IF NOT EXISTS meetings (
//             id SERIAL PRIMARY KEY,
//             user_id INT[],
//             title VARCHAR(255) NOT NULL,
//             description TEXT,
//             start_time TIMESTAMP NOT NULL,
//             end_time TIMESTAMP NOT NULL,
//             join_url TEXT,
//             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//         );`;

//         await pool.query(query);
//         res.status(200).json({ message: 'Tables created successfully' });
//     } catch (error) {
//         console.error('Error creating tables:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// export default router;

