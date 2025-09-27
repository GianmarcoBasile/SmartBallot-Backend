import { Router, type Request, type Response } from "express";
import type { CONDOMINIUM } from "../types.js";
import { addCondominiumToUser, getUserCondominiums } from "../services/user.js";
import { registerCondominium } from "../services/condominium.js";

const router:Router = Router();

router.post('/', async (req:Request, res:Response) => {
  const tax_code : string = req.body.tax_code;
  const condominiums:CONDOMINIUM[] = await getUserCondominiums(tax_code);
  return res.status(200).json({status: 'success', message: 'Condominiums retrieved successfully', condominiums: condominiums});
});

router.post('/register', async (req:Request, res:Response) => {
  const data : CONDOMINIUM = req.body;
  try {
    await registerCondominium(data);
    await addCondominiumToUser(data.admin.tax_code, data);
    return res.status(201).json({status: 'success', message: 'Condominium registered successfully'});
  } catch (error) {
    console.error('Error registering condominium:', error);
    return res.status(500).json({status: 'error', message: 'Failed to register condominium'});
  }
});

export default router;

