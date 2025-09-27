import jwt from 'jsonwebtoken';
import type { USER } from '../types.js';
import { findUserByEmail } from '../services/user.js';

export function generateAccessToken(userEmail: string): string {
    const access_token = jwt.sign({ userEmail }, process.env.JWT_ACCESS_SECRET ?? '', { expiresIn: '1h' });
    return access_token;
}

export function generateRefreshToken(userEmail: string): string {
    const refresh_token = jwt.sign({ userEmail }, process.env.JWT_REFRESH_SECRET ?? '', { expiresIn: '7d' });
    return refresh_token;
}

export async function verifyToken(type: 'access' | 'refresh', token: string): Promise<USER | null> {
    try {
        const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
        const decoded = jwt.verify(token, secret ?? '') as { userEmail: string };
        const user:USER|null = await findUserByEmail(decoded.userEmail);
        return user;
    } catch (error) {
        return null;
    }
}

