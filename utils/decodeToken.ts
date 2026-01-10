import jwt, { JwtPayload } from 'jsonwebtoken';

const decodeToken = (token: string): string | JwtPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (error: any) {
    console.error('Error decoding token:', error.message);
    return null;
  }
};

export default decodeToken;
