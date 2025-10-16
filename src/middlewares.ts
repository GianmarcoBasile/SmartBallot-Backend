import { Request, Response, NextFunction } from "express";
import { findCondominiumById } from "./services/condominium.js";
import { verifyToken } from "./utils/jwt.js";
import type { CONDOMINIUM, USER } from "./types.js";

export interface AuthenticatedRequest extends Request {
  user?: USER;
}

// Authentication middleware to protect routes
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        status: "error",
        message: "Authentication token is missing or malformed",
      });
      return;
    }

    const token = authHeader.substring(7);

    const user = await verifyToken("access", token);

    if (!user) {
      res.status(401).json({
        status: "error",
        message: "Token is not valid or expired",
      });
      return;
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

// Middleware to check if the user is an admin of the specified condominium
export async function requireCondominiumAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const condominiumId = req.params.condominiumId || req.params.id;
    const userTaxCode = req.user?.tax_code;

    if (!req.user || !userTaxCode) {
      res.status(401).json({
        status: "error",
        message: "Not authenticated",
      });
      return;
    }

    if (!condominiumId) {
      res.status(400).json({
        status: "error",
        message: "Condominium ID is missing",
      });
      return;
    }

    const { isCondominiumAdmin } = await import("./services/condominium.js");

    const isAdmin = await isCondominiumAdmin(condominiumId, userTaxCode);
    if (!isAdmin) {
      res.status(403).json({
        status: "error",
        message: "You are not an admin of this condominium",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Error in condominium admin check:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

// Middleware to check if the user is a member of the specified condominium
export async function requireCondominiumMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const condominiumId = req.params.condominiumId || req.params.id;
    const userTaxCode = req.user?.tax_code;

    if (!req.user || !userTaxCode) {
      res.status(401).json({ status: "error", message: "Not authenticated" });
      return;
    }

    if (!condominiumId) {
      res
        .status(400)
        .json({ status: "error", message: "Condominium ID is missing" });
      return;
    }

    const condominium = await findCondominiumById(condominiumId);

    if (!condominium) {
      res
        .status(404)
        .json({ status: "error", message: "Condominium not found" });
      return;
    }

    if (condominium.admin && condominium.admin.tax_code === userTaxCode) {
      next();
      return;
    }

    if (Array.isArray(condominium.users)) {
      const found = condominium.users.find(
        (u: any) => u.tax_code === userTaxCode,
      );
      if (found) {
        next();
        return;
      }
    }

    res.status(403).json({
      status: "error",
      message: "You are not a member of this condominium",
    });
    return;
  } catch (error) {
    console.error("Error in membership check:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}
