import { Request, Response, NextFunction } from 'express';
import { isCondominiumAdmin } from './services/condominium.js';

export async function requireCondominiumAdmin(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  const { condominiumId } = req.params;
  const userTaxCode = req.body.user?.tax_code;
  
  if (!userTaxCode) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  if (!condominiumId) {
    return res.status(400).json({ error: 'ID del condominio mancante' });
  }

  const isAdmin = await isCondominiumAdmin(condominiumId, userTaxCode);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Non sei amministratore di questo condominio' });
  }
  
  next();
}