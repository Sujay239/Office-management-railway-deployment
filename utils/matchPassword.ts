import bcrypt from 'bcrypt';

const matchPassword = async (enteredPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(enteredPassword , hashedPassword);
  } catch (error) {
    console.error('Error matching password:', error);
    return false;
  }
};

export default matchPassword;
