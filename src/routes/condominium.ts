import { Router, type Request, type Response } from "express";
import type { CONDOMINIUM } from "../types.js";
import { addCondominiumToUser } from "../services/user.js";
import {
  addResidentToCondominium,
  createCondominiumElection,
  findCondominiumById,
  getCondominiumsFromUser,
  registerCondominium,
} from "../services/condominium.js";
import {
  requireAuth,
  requireCondominiumAdmin,
  requireCondominiumMember,
} from "../middlewares.js";

const router: Router = Router();

// Endpoint to get all user's condominiums
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const tax_code: string = req.body.tax_code;
  const condominiums: CONDOMINIUM[] = await getCondominiumsFromUser(tax_code);
  return res.status(200).json({
    status: "success",
    message: "Condominiums retrieved successfully",
    condominiums: condominiums,
  });
});

// Endpoint to register a new condominium
router.post("/register", requireAuth, async (req: Request, res: Response) => {
  const data: CONDOMINIUM = req.body;
  try {
    const result = await registerCondominium(data);

    const createdCondominium = await findCondominiumById(
      result.insertedId.toString(),
    );
    if (createdCondominium) {
      await addCondominiumToUser(data.admin.tax_code, createdCondominium);
    }

    return res.status(201).json({
      status: "success",
      message: "Condominium registered successfully",
    });
  } catch (error) {
    console.error("Error registering condominium:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to register condominium" });
  }
});

// Endpoint to add a resident to a condominium
router.post(
  "/:id/addResident",
  requireAuth,
  requireCondominiumAdmin,
  async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res
        .status(400)
        .json({ status: "error", message: "Condominium ID is required" });
    }
    const condominium_id: string = req.params.id;
    const resident = req.body;
    try {
      await addResidentToCondominium(condominium_id, resident);
      return res
        .status(201)
        .json({ status: "success", message: "Resident added successfully" });
    } catch (error) {
      console.error("Error adding resident:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Failed to add resident" });
    }
  },
);

// Endpoint to view details of a specific condominium
router.get(
  "/:id",
  requireAuth,
  requireCondominiumMember,
  async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res
        .status(400)
        .json({ status: "error", message: "Condominium ID is required" });
    }
    const condominium_id: string = req.params.id;
    try {
      const condominium = await findCondominiumById(condominium_id);
      if (!condominium) {
        return res
          .status(404)
          .json({ status: "error", message: "Condominium not found" });
      }
      return res.status(200).json({
        status: "success",
        message: "Condominium retrieved successfully",
        condominium,
      });
    } catch (error) {
      console.error("Error retrieving condominium:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Failed to retrieve condominium" });
    }
  },
);

// Endpoint to create a new election for a condominium
router.post(
  "/:id/createElection",
  requireAuth,
  requireCondominiumAdmin,
  async (req: Request, res: Response) => {
    if (!req.params.id) {
      return res
        .status(400)
        .json({ status: "error", message: "Condominium ID is required" });
    }
    const condominium_id = req.params.id;
    try {
      const { election } = req.body;
      if (!election) {
        return res
          .status(400)
          .json({ status: "error", message: "Election data is required" });
      }
      await createCondominiumElection(condominium_id, election);
      return res
        .status(201)
        .json({ status: "success", message: "Election created successfully" });
    } catch (error) {
      console.error("Error creating new election:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Error creating new election" });
    }
  },
);

export default router;
