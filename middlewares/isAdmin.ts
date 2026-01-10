import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

type users = {
    id: Number,
    email: String,
    role: String,
}

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: 'Authentication failed: Token is missing' });
    }
    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: users | any) => {
        if (err) {
            return res.status(403).json({ message: 'Authentication failed: Invalid or expired token' });
        }
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Authentication failed: Forbidden access Admin only.' });
        }
        next();
    });
};

export default isAdmin;
