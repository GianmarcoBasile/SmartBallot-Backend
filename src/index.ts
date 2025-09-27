import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import cookieparser from 'cookie-parser';
import authRoutes from './routes/auth.js';

dotenv.config();

export const app: express.Express = express();

app.use(cookieparser());

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

const port: number = Number(process.env.SERVER_PORT) || 3000;

app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});