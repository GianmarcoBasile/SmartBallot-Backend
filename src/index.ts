import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

export const app: express.Express = express();
app.use(express.json());

const port: number = Number(process.env.SERVER_PORT) || 3000;

app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});