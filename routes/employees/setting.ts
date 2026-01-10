import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import decodeToken from '../../utils/decodeToken';
import matchPassword from '../../utils/matchPassword';
import hashPassword from '../../utils/hashPassword';
import { logAudit } from '../../utils/auditLogger';
const router = express.Router();


router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded: any = await decodeToken(token);
        const id = decoded.id;

        // Get current password hash
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) return res.status(404).json({ message: "User not found" });

        const user = userResult.rows[0];

        // Verify old password
        const isMatch = await matchPassword(oldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, id]);

        await logAudit(id, 'PASSWORD_CHANGED', 'users', id, { event: 'Password changed successfully' }, req);

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.put('/updateProfile', authenticateToken, async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded: any = await decodeToken(token);
        const id = decoded.id;
        const { name, phone, location, bio, avatar, designation } = req.body;

        // Update user
        // Note: avatar comes as base64 or url. If base64, we might want to save it or just store string.
        // For now assuming it's a string (URL or Base64) and storing directly
        // (Postgres TEXT can handle large strings, but better to upload.
        // Frontend 'handleAvatarUpload' sends base64 currently).

        const query = `
            UPDATE users
            SET name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                location = COALESCE($3, location),
                bio = COALESCE($4, bio),
                avatar_url = COALESCE($5, avatar_url),
                designation = COALESCE($6, designation),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING id, name, email, role, designation, phone, location, bio, avatar_url as avatar
        `;

        const result = await pool.query(query, [name, phone, location, bio, avatar, designation, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        await logAudit(id, 'PROFILE_UPDATED', 'users', id, { updatedFields: Object.keys(req.body) }, req);

        res.json({ success: true, user: result.rows[0], message: "Profile updated successfully" });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
