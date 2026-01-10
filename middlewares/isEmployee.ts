// middleware to check if the user is an employee
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
type users = {
    id : Number ,
    email : String,
    role : String,
}

const isEmployee = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: 'Authentication failed: Token is missing' });
    }
    await jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: users | any) => {
        if (err) {
            return res.status(403).json({ message: 'Authentication failed: Invalid or expired token' });
        }
        if (user.role !== 'employee') {
            return res.status(403).json({ message: 'Authentication failed: Forbidden access Employee only.' });
        }
        next();
    });
};

export default isEmployee;
