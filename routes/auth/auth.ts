import express, { Request, Response } from 'express';
import pool from '../../db/db';
import matchPassword from '../../utils/matchPassword';
import generateToken from '../../utils/generateToken';
import decodeToken from '../../utils/decodeToken';
import { authenticateToken } from '../../middlewares/authenticateToken';
import isAdmin from '../../middlewares/isAdmin';
const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;


    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isMatch = await matchPassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // If 2FA is enabled, they are NOT verified yet.
        // If 2FA is disabled, they are automatically verified.
        const is2FAVerified = !user.two_factor_enabled;
        const token = await generateToken(user.id, user.email, user.role, is2FAVerified);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        })

        res.json({ message: 'Login successful', role: user.role });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/2fa', authenticateToken, isAdmin, async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const decoded: any = await decodeToken(token);
        const id = decoded.id;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        res.json({ twoFactorEnabled: result.rows[0].two_factor_enabled });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
})

router.post('/authorized-2fa', authenticateToken, isAdmin, async (req: Request, res: Response) => {

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: 'Code is required' });
    }

    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const decoded: any = await decodeToken(token);
        const id = decoded.id;
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        // FIX: Compare 2FA code with two_factor_secret, NOT password_hash
        const isMatch = await matchPassword(code, user.two_factor_secret);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid 2FA code' });
        }

        // Generate a new token with 2FA verified
        const newToken = await generateToken(user.id, user.email, user.role, true);

        if (newToken) {
            res.cookie('token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });
        }

        res.json({ message: 'Login successful', role: user.role });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }

});



router.post('/logout', async (req: Request, res: Response) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
});



router.get('/me', async (req: Request, res: Response) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const decoded = await decodeToken(token);
        res.json({ user: decoded });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
});


router.get('/myData', authenticateToken, async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const decoded: any = await decodeToken(token);
        const id = decoded.id;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        res.json({ user: result.rows[0] });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
})



router.post('/verify-password', authenticateToken, async (req: Request, res: Response) => {
    const { password } = req.body;
    // req.user is populated by authenticateToken, but we need to fetch the full user for the password hash
    // authenticateToken puts decoded token in req.user, usually { id, email, role }

    // We need to type-cast or use the decoded info. standard authenticateToken middleware attaches to req.user
    // Looking at other routes, they use decodeToken manually or rely on cookie.
    // But authenticateToken is middleware. Let's see how it's used in 'myData'.
    // 'myData' manually decodes token again? No, let's look at line 152.
    // It manually uses decodeToken.
    // Let's stick to the pattern used in the file for consistency, or use the middleware properly if it's set up.
    // Line 152: router.get('/myData', authenticateToken, ...) but then it grabs token from cookie again?
    // That's redundant but confirms the pattern.

    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ message: 'Not authenticated' });

        const decoded: any = await decodeToken(token);
        const id = decoded.id;

        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result.rows[0];
        const isMatch = await matchPassword(password, user.password_hash);

        if (isMatch) {
            return res.status(200).json({ success: true, message: 'Password verified' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


export default router;
