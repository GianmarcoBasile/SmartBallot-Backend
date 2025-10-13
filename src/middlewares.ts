import { Request, Response, NextFunction } from 'express';
import { findCondominiumById } from './services/condominium.js';
import { verifyToken } from './utils/jwt.js';
import type { USER } from './types.js';

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

export async function requireCondominiumAdmin(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const condominiumId = req.params.condominiumId || req.params.id;
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
    
    const { isCondominiumAdmin } = await import('./services/condominium.js');
    
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

export async function requireCondominiumMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const condominiumId = req.params.condominiumId || req.params.id;
    const userTaxCode = req.user?.tax_code;

    if (!req.user || !userTaxCode) {
      res.status(401).json({ status: 'error', message: 'Non autenticato' });
      return;
    }

    console.log('condominiumId found:', condominiumId);

    if (!condominiumId) {
      res.status(400).json({ status: 'error', message: 'ID condominio mancante' });
      return;
    }

    const condominium = await findCondominiumById(condominiumId);

    if (!condominium) {
      res.status(404).json({ status: 'error', message: 'Condominio non trovato' });
      return;
    }

    if (condominium.admin && condominium.admin.tax_code === userTaxCode) {
      next();
      return;
    }

    // Controlla nell'array users
    if (Array.isArray(condominium.users)) {
      const found = condominium.users.find((u: any) => u.tax_code === userTaxCode);
      if (found) {
        next();
        return;
      }
    }

    res.status(403).json({ status: 'error', message: 'Non sei membro di questo condominio' });
    return;
  } catch (error) {
    console.error('Errore nel controllo membership:', error);
    res.status(500).json({ status: 'error', message: 'Errore interno del server' });
  }
}