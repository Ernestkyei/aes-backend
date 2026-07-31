import dotenv from 'dotenv';
dotenv.config({ path: './config/config.env' });
import app from './app.js';
import prisma from './config/database.js';

const PORT = process.env.PORT

const startServer = async () => {
  try {
    // Confirm database connection before accepting requests
    await prisma.$connect();
    console.log('Database connected successfully');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();