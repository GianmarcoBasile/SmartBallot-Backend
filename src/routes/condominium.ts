import { Router, type Request, type Response } from "express";
import type { CONDOMINIUM } from "../types.js";
import { addCondominiumToUser, getUserCondominiums } from "../services/user.js";
import { addResidentToCondominium, createCondominiumElection, findCondominiumById, registerCondominium, removeResidentFromCondominium } from "../services/condominium.js";

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

router.post('/:id/addResident', async (req:Request, res:Response) => {
  if (!req.params.id) {
    return res.status(400).json({status: 'error', message: 'Condominium ID is required'});
  }
  const condominium_id : string = req.params.id;
  const resident = req.body;
  try {
    await addResidentToCondominium(condominium_id, resident);
    return res.status(201).json({status: 'success', message: 'Resident added successfully'});
  } catch (error) {
    console.error('Error adding resident:', error);
    return res.status(500).json({status: 'error', message: 'Failed to add resident'});
  }
});

router.post('/:id/removeResident', async (req:Request, res:Response) => {
  if (!req.params.id) {
    return res.status(400).json({status: 'error', message: 'Condominium ID is required'});
  }
  const condominium_id : string = req.params.id;
  const { tax_code } = req.body;
  if (!tax_code) {
    return res.status(400).json({status: 'error', message: 'Resident tax code is required'});
  }
  try {
    await removeResidentFromCondominium(condominium_id, tax_code);
    return res.status(200).json({status: 'success', message: 'Resident removed successfully'});
  } catch (error) {
    console.error('Error removing resident:', error);
    return res.status(500).json({status: 'error', message: 'Failed to remove resident'});
  }
});

router.get('/:id', async (req:Request, res:Response) => {
  if (!req.params.id) {
    return res.status(400).json({status: 'error', message: 'Condominium ID is required'});
  }
  const condominium_id : string = req.params.id;
  try {
    const condominium = await findCondominiumById(condominium_id);
    if (!condominium) {
      return res.status(404).json({status: 'error', message: 'Condominium not found'});
    }
    return res.status(200).json({status: 'success', message: 'Condominium retrieved successfully', condominium});
  } catch (error) {
    console.error('Error retrieving condominium:', error);
    return res.status(500).json({status: 'error', message: 'Failed to retrieve condominium'});
  }
});

router.post('/:id/createElection', async (req:Request, res:Response) => {
  if(!req.params.id) {
    return res.status(400).json({status: 'error', message: 'Condominium ID is required'});
  }
  const condominium_id = req.params.id;
  try {
    const { election } = req.body;
    if (!election) {
      return res.status(400).json({status: 'error', message: 'Election data is required'});
    }
    await createCondominiumElection(condominium_id, election);
    return res.status(201).json({status: 'success', message: 'Election created successfully'});
  } catch (error) {
    console.error('Error creating new election:', error);
    return res.status(500).json({status: 'error', message: 'Error creating new election'});
  }
});

export default router;

