import jwt from 'jsonwebtoken';

const generateToken = (id: number, email: string, role: string, is2FAVerified: boolean = true): string | null => {
  try {
    return jwt.sign(
      { id, email, role, is2FAVerified },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );
  } catch (error) {
    console.error('Error generating token:', error);
    return null;
  }
};

export default generateToken;
