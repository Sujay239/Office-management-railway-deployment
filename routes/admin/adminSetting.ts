import express, { Request, Response } from 'express';
import pool from '../../db/db';
import { authenticateToken } from '../../middlewares/authenticateToken';
import isAdmin from '../../middlewares/isAdmin';
import { enforce2FA } from '../../middlewares/enforce2FA';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import decodeToken from '../../utils/decodeToken';

const router = express.Router();

// --- 1. Multer Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        // Ensure folder exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate a random unique name: timestamp + random number + extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ storage: storage });

// --- 2. The Route ---
// usage: upload.single('avatar') looks for a form-data field named "avatar"
router.post('/updateAdmin', authenticateToken, isAdmin, enforce2FA, upload.single('avatar'), async (req: Request, res: Response) => {
    try {
        // Extract text fields
        const { name, designation, phone, location, password } = req.body;
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const data: any = await decodeToken(token);
        const id = data.id;
        // 1. Basic Validation
        if (!id || !password) {
            // Remove uploaded file if validation fails to prevent junk files
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'User ID and Password are required to save changes.' });
        }

        // 2. Fetch Current User Data (to get old avatar and verify password)
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'User not found' });
        }

        const currentUser = userResult.rows[0];

        // 3. Verify Password (Security Check)
        // We compare the plaintext password sent in body with the hash in DB
        const isMatch = await bcrypt.compare(password, currentUser.password_hash);
        if (!isMatch) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ message: 'Incorrect password. Changes not saved.' });
        }

        // 4. Handle Avatar Logic
        let avatarUrl = currentUser.avatar_url; // Default to existing

        if (req.file) {
            // New image uploaded!
            const newFilename = req.file.filename;

            // Delete old avatar if it exists and is not null
            if (currentUser.avatar_url) {
                const oldPath = path.join('uploads', currentUser.avatar_url);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath); // Delete old file
                    } catch (err) {
                        console.error("Failed to delete old avatar:", err);
                        // Continue even if delete fails
                    }
                }
            }

            // Set new avatar URL to be saved
            avatarUrl = newFilename;
        }

        // 5. Update Database
        // We update name, designation, phone, location, and avatar_url
        const updateQuery = `
            UPDATE users
            SET name = $1, designation = $2, phone = $3, location = $4, avatar_url = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING id, name, email, designation, phone, location, avatar_url, role
        `;

        const values = [
            name || currentUser.name,               // Keep old value if new is undefined
            designation || currentUser.designation,
            phone || currentUser.phone,
            location || currentUser.location,
            avatarUrl,
            id
        ];

        const result = await pool.query(updateQuery, values);

        res.status(200).json({
            message: "Profile updated successfully",
            user: result.rows[0]
        });

    } catch (error) {
        // Cleanup: If server error occurs after file upload, delete the new file
        if (req.file) {
            fs.unlink(req.file.path, (err) => { if (err) console.error(err); });
        }
        console.error('Error updating admin:', error);
        res.status(500).json({ message: 'Internal server error while updating admin' });
    }
});

// --- 3. Change Password Route ---
router.post('/changePassword', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const token = req.cookies?.token;

        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const data: any = await decodeToken(token);
        const id = data.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required.' });
        }

        // 1. Fetch user to get current hash
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const currentUser = userResult.rows[0];

        // 2. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, currentUser.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // 3. Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. Update password
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, id]);

        res.status(200).json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/enable-2fa', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const { pin } = req.body;
        const token = req.cookies?.token;

        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const data: any = await decodeToken(token);
        const id = data.id;

        if (!pin) {
            return res.status(400).json({ message: 'Pin is required.' });
        }

        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // const currentUser = userResult.rows[0];

        const pinHash = await bcrypt.hash(pin, 10);

        await pool.query('UPDATE users SET two_factor_secret = $1, two_factor_enabled = true WHERE id = $2', [pinHash, id]);

        res.status(200).json({ message: '2FA enabled successfully' });

    } catch (error) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/disable-2fa', authenticateToken, isAdmin, enforce2FA, async (req: Request, res: Response) => {
    try {
        const { pin } = req.body;
        const token = req.cookies?.token;

        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const data: any = await decodeToken(token);
        const id = data.id;

        if (!pin) {
            return res.status(400).json({ message: 'Pin is required.' });
        }

        const userResult = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPin = userResult.rows[0].two_factor_secret;

        if (!hashedPin) {
            return res.status(400).json({ message: '2FA is not enabled' });
        }

        const isMatch = await bcrypt.compare(pin, hashedPin);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid pin' });
        }

        await pool.query('UPDATE users SET two_factor_secret = null, two_factor_enabled = false WHERE id = $1', [id]);

        res.status(200).json({ message: '2FA disabled successfully' });

    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
