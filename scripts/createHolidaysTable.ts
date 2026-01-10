// import { Request, Response, Router } from 'express';
// import pool from '../db/db';

// const router = Router();

// router.post('/', async (req: Request, res: Response) => {
//     try {
//         const query = `
//             CREATE TABLE IF NOT EXISTS holidays (
//                 id SERIAL PRIMARY KEY,
//                 name VARCHAR(255) NOT NULL,
//                 date DATE NOT NULL,
//                 day VARCHAR(20),
//                 type VARCHAR(50),
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//             );
//         `;
//         await pool.query(query);
//         res.status(201).json({ message: 'Holidays inserted successfully' });
//     } catch (error) {
//         console.error('Error inserting holidays:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });
// router.post('/insert', async (req: Request, res: Response) => {
//     try {
//         const query = `
//            TRUNCATE TABLE holidays RESTART IDENTITY;
//             INSERT INTO holidays (name, date, day, type) VALUES
//             ('NEW YEAR’S DAY', '2026-01-01', 'Thursday', 'National Holiday'),
//             ('SARASWATI PUJA', '2026-01-23', 'Friday', 'Festival'),
//             ('REPUBLIC DAY OF INDIA', '2026-01-26', 'Monday', 'National Holiday'),
//             ('HOLI', '2026-03-03', 'Wednesday', 'Festival'),
//             ('HOLI', '2026-03-04', 'Thursday', 'Festival'),
//             ('POILA BAISAKH', '2026-04-15', 'Wednesday', 'Festival'),
//             ('MAY DAY', '2026-05-01', 'Friday', 'Observance'),
//             ('ID-UL-FITR', '2026-03-20', 'Friday', 'Festival'),
//             ('ID-UZ-ZOHA', '2026-05-27', 'Wednesday', 'Festival'),
//             ('INDEPENDENCE DAY', '2026-08-15', 'Saturday', 'National Holiday'),
//             ('MAHATMA GANDHI’S BIRTHDAY', '2026-10-02', 'Friday', 'National Holiday'),
//             ('DURGA PUJA', '2026-10-19', 'Monday', 'Festival'),
//             ('KALI PUJA', '2026-11-08', 'Sunday', 'Festival'),
//             ('CHRISTMAS DAY', '2026-12-25', 'Friday', 'Festival');
//         `;
//         await pool.query(query);
//         res.status(201).json({ message: 'Holidays inserted successfully' });
//     } catch (error) {
//         console.error('Error inserting holidays:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// export default router;
