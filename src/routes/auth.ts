import type { USER } from '../types.js';
import { registerUser, findUserByEmail, isUserRegistered } from '../services/user.js';
import { Router, type Request, type Response } from 'express';
import { comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';

const router: Router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data: USER = req.body;
    const {full_name, email, tax_code, password, birth_date, birth_place} = data;
    if (await isUserRegistered(email, tax_code)) {
      return res.status(409).json({ status: 'error', message: 'User already exists' });
    } else {
      await registerUser({
        full_name,
        email,
        tax_code,
        password,
        birth_date,
        birth_place,
        condominiums: []
      });


      return res.status(201).json({ status: 'success', message: 'User registered successfully'});
    }

  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error', description: error instanceof Error ? error.message : String(error)});
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user:USER|null = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    if (await comparePassword(password, user.password) === false) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const access_token = generateAccessToken(user);
    const refresh_token = generateRefreshToken(user);
    
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({ 
      status: 'success', 
      message: 'User logged in successfully', 
      access_token: access_token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        tax_code: user.tax_code
      }
    });

  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error', description: error instanceof Error ? error.message : String(error)});
  }
});

router.get('/logout', (req: Request, res: Response) => {
  res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
  return res.status(200).json({ status: 'success', message: 'User logged out successfully' });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(401);

  try {
    const user: USER | null = await verifyToken('refresh', refreshToken);
    if (!user) return res.sendStatus(403);
    const newAccessToken = generateAccessToken(user);
    res.json({ user, access_token: newAccessToken });
  } catch (err) {
    return res.sendStatus(403);
  }
});

router.get('/verify-token', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ status: 'error', message: 'Token is required' });
    }

    const token = authHeader.substring(7);
    const user: USER | null = await verifyToken('access', token);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }

    return res.status(200).json({ 
      status: 'success', 
      message: 'Token is valid', 
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        tax_code: user.tax_code
      }
    });

  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error', description: error instanceof Error ? error.message : String(error)});
  }
});

export default router;