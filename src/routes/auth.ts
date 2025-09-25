import {app} from '../index.js';
import type { USER } from '../types.js';
import { addUser, findUserByEmail, isUserRegistered } from '../services/user.js';
import { Router } from 'express';
import { comparePassword } from '../utils/password.js';

const router: Router = Router();

router.post('/register', async (req, res) => {
  try {
    const data: USER = req.body;
    const {full_name, email, tax_code, password, birth_date, birth_place} = data;
    if (await isUserRegistered(email, tax_code)) {
      return res.status(409).json({ status: 'error', message: 'User already exists' });
    } else {
      await addUser({
        full_name,
        email,
        tax_code,
        password,
        birth_date,
        birth_place
      });
      return res.status(201).json({ status: 'success', message: 'User registered successfully' });
    }

  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error', description: error instanceof Error ? error.message : String(error)});
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }
    if (await comparePassword(password, user.password) === false) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }
    return res.status(200).json({ status: 'success', message: 'User logged in successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error', description: error instanceof Error ? error.message : String(error)});
  }
});

export default router;