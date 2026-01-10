// // Clear attendance table
// import express from "express";
// import  pool  from "../db/db.js";
// const router = express.Router();

// router.delete('/attendance', async (req, res) => {
//   try {
//     await pool.query('DELETE FROM attendance');
//     res.status(200).json({ message: 'All attendance records deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to clear attendance table' });
//   }
// });


// router.delete('/chats' , async (req, res) => {
//     try {
//       await pool.query('BEGIN; TRUNCATE TABLE messages, chat_members, chats RESTART IDENTITY CASCADE; COMMIT; ');
//         res.status(200).json({ message: 'All chat records deleted successfully' });
//       } catch (error) {
//         res.status(500).json({ error: 'Failed to clear chat table' });
//       }
// })

// export default router;
