import { Router, type Request, type Response } from "express";
import type { USER } from "../types.js";
import { findUserByTaxCode } from "../services/user.js";

const router:Router = Router();

router.get('/:tax_code', async (req:Request, res:Response) => {
  const { tax_code } = req.params;
  if (!tax_code) {
    return res.status(400).json({status: 'error', message: 'Tax code is required'});
  }
  const user:USER|null = await findUserByTaxCode(tax_code);
  if (!user) {
    return res.status(404).json({status: 'error', message: 'User not found'});
  }
  res.status(200).json({status: 'success', message: `User route is working for tax code: ${tax_code}`, user});
});

export default router;