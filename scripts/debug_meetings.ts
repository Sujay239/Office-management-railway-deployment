
// import pool from '../db/db';

// async function checkMeetings() {
//     try {
//         console.log('--- Checking Meetings Table ---');
//         const res = await pool.query('SELECT id, title, start_time, user_id FROM meetings');
//         console.log(`Found ${res.rows.length} meetings.`);
//         res.rows.forEach(row => {
//             console.log(`Meeting ${row.id}: "${row.title}"`, {
//                 start: row.start_time,
//                 userIds: row.user_id,
//                 userIdsType: Array.isArray(row.user_id) ? 'Array' : typeof row.user_id
//             });
//         });

//         console.log('\n--- Checking Users ---');
//         const userRes = await pool.query('SELECT id, name, email FROM users LIMIT 5');
//         userRes.rows.forEach(u => {
//             console.log(`User ${u.id}: ${u.name} (${u.email})`);
//         });

//     } catch (err) {
//         console.error('Error querying DB:', err);
//     } finally {
//         process.exit();
//     }
// }

// checkMeetings();
