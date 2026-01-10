import bcrypt from 'bcrypt';

const hashPassword = async (password: string): Promise<string> => {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Password hashing failed');
    }
};

export default hashPassword;
