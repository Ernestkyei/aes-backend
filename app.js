import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

const app = express();

//======middleware===========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//=========http morgan request================
app.use(morgan('dev'));

//=========routes================
app.use('/api/auth', authRoutes);

export default app;