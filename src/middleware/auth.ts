import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import type { USER } from '../types.js';

export interface AuthenticatedRequest extends Request {
  user?: USER;
}

// Middleware di autenticazione usando la tua implementazione JWT esistente
export async function requireAuth(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    // Estrai il token dall'header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Token di autenticazione mancante' 
      });
      return;
    }

    const token = authHeader.substring(7);
    
    const user = await verifyToken('access', token);
    
    if (!user) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Token non valido o scaduto' 
      });
      return;
    }

    // Aggiungi l'utente alla richiesta
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Errore nel middleware di autenticazione:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Errore interno del server' 
    });
  }
}

// Middleware per verificare se l'utente è admin del condominio
export async function requireCondominiumAdmin(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const condominiumId = req.params.condominiumId;
    const userTaxCode = req.user?.tax_code;
    
    if (!req.user || !userTaxCode) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Non autenticato' 
      });
      return;
    }
    
    if (!condominiumId) {
      res.status(400).json({ 
        status: 'error', 
        message: 'ID condominio mancante' 
      });
      return;
    }
    
    // Importazione dinamica per evitare dipendenze circolari
    const { isCondominiumAdmin } = await import('../services/condominium.js');
    
    const isAdmin = await isCondominiumAdmin(condominiumId, userTaxCode);
    if (!isAdmin) {
      res.status(403).json({ 
        status: 'error', 
        message: 'Non sei amministratore di questo condominio' 
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Errore nel controllo admin:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Errore interno del server' 
    });
  }
}