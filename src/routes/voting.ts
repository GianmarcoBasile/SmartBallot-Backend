import { Router, type Request, type Response } from "express";
import {
  submitVote,
  getElectionResults,
  getElectionDetails,
  closeElection,
} from "../services/voting.js";
import { findCondominiumById } from "../services/condominium.js";
import {
  requireAuth,
  requireCondominiumAdmin,
  requireCondominiumMember,
  type AuthenticatedRequest,
} from "../middlewares.js";
import { getUsersCollection } from "../database.js";

const router: Router = Router();

// Endpoint for submitting a vote
router.post(
  "/:condominiumId/elections/:electionId/vote",
  requireAuth,
  requireCondominiumMember,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const condominiumId = req.params.condominiumId;
      const electionId = req.params.electionId;
      const { optionIndex, proof } = req.body;

      if (!condominiumId || !electionId) {
        return res.status(400).json({
          status: "error",
          message: "Condominium ID and Election ID are required",
        });
      }

      // If proof or optionIndex are not provided
      if (!proof) {
        return res.status(400).json({
          status: "error",
          message: "Semaphore proof is required",
        });
      }

      if (optionIndex === undefined || optionIndex === null) {
        return res.status(400).json({
          status: "error",
          message: "Option index is required",
        });
      }

      // Retrieve condominium
      const condominium = await findCondominiumById(condominiumId);
      if (!condominium || !condominium.contract_address) {
        return res.status(404).json({
          status: "error",
          message: "Condominium contract not found",
        });
      }

      // Check if election exists
      const electionIdNum = parseInt(electionId);

      let election = condominium.elections?.find(
        (e) => e.blockchain_id === electionIdNum,
      );

      if (!election) {
        return res.status(404).json({
          status: "error",
          message: `Election with blockchain_id ${electionIdNum} not found. Available elections: ${condominium.elections?.length || 0}`,
        });
      }

      // Check if optionIndex is valid
      const optionIndexNum = parseInt(optionIndex);
      if (optionIndexNum >= election.options.length || optionIndexNum < 0) {
        return res.status(400).json({
          status: "error",
          message: "Invalid option index",
        });
      }

      // Submit the vote
      const txHash = await submitVote(
        condominium.contract_address,
        electionIdNum,
        optionIndexNum,
        proof,
      );

      res.json({
        status: "success",
        message: "Vote submitted successfully",
        transactionHash: txHash,
      });
    } catch (error) {
      console.error("Error submitting vote:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to submit vote",
      });
    }
  },
);

// Retrieve election results
router.get(
  "/:condominiumId/elections/:electionId/results",
  requireAuth,
  requireCondominiumMember,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const condominiumId = req.params.condominiumId;
      const electionId = req.params.electionId;

      if (!condominiumId || !electionId) {
        return res.status(400).json({
          status: "error",
          message: "Condominium ID and Election ID are required",
        });
      }

      const condominium = await findCondominiumById(condominiumId);
      if (!condominium || !condominium.contract_address) {
        return res.status(404).json({
          status: "error",
          message: "Condominium contract not found",
        });
      }

      const electionIdNum = parseInt(electionId);
      const election = condominium.elections?.find(
        (e) => e.blockchain_id === electionIdNum,
      );
      if (!election) {
        return res.status(404).json({
          status: "error",
          message: "Election not found",
        });
      }

      // Get results from blockchain
      const results = await getElectionResults(
        condominium.contract_address,
        electionIdNum,
        election.options.length,
      );

      // Combine with option names
      const detailedResults = results.map((result) => ({
        optionIndex: result.optionIndex,
        optionName:
          election.options[result.optionIndex]?.name ||
          `Option ${result.optionIndex}`,
        voteCount: result.voteCount,
      }));

      // Calculate total votes
      const totalVotes = results.reduce(
        (sum, result) => sum + result.voteCount,
        0,
      );

      res.json({
        status: "success",
        results: detailedResults,
        totalVotes,
        election: {
          name: election.name,
          blockchain_id: election.blockchain_id,
          options: election.options,
        },
      });
    } catch (error) {
      console.error("Error getting election results:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get election results",
      });
    }
  },
);

// Retrieve Semaphore group for a condominium
router.get(
  "/:condominiumId/group",
  requireAuth,
  requireCondominiumMember,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const condominiumId = req.params.condominiumId;

      if (!condominiumId) {
        return res.status(400).json({
          status: "error",
          message: "Condominium ID is required",
        });
      }

      // Retrieve condominium
      const condominium = await findCondominiumById(condominiumId);
      if (!condominium) {
        return res.status(404).json({
          status: "error",
          message: "Condominium not found",
        });
      }

      // Extract identity commitments of all users in the condominium
      const identityCommitments: string[] = [];
      const usersCollection = await getUsersCollection();

      // Collect all tax codes from the condominium users
      const allTaxCodes: string[] = [];
      if (condominium.users) {
        condominium.users.forEach((user) => {
          allTaxCodes.push(user.tax_code);
        });
      }

      // Fetch identity_commitment from users collection for all participants
      const users = await usersCollection
        .find({
          tax_code: { $in: allTaxCodes },
        })
        .toArray();

      users.forEach((user) => {
        if (user.identity_commitment) {
          identityCommitments.push(user.identity_commitment);
        }
      });

      res.json({
        status: "success",
        group: identityCommitments,
      });
    } catch (error) {
      console.error("Error getting Semaphore group:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get Semaphore group",
      });
    }
  },
);

router.put(
  "/:condominiumId/elections/:electionId/close",
  requireAuth,
  requireCondominiumAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const condominiumId = req.params.condominiumId;
      const electionId = req.params.electionId;

      if (!condominiumId || !electionId) {
        return res.status(400).json({
          status: "error",
          message: "Condominium ID and Election ID are required",
        });
      }

      const condominium = await findCondominiumById(condominiumId);
      if (!condominium || !condominium.contract_address) {
        return res.status(404).json({
          status: "error",
          message: "Condominium contract not found",
        });
      }

      const electionIdNum = parseInt(electionId);
      const election = condominium.elections?.find(
        (e) => e.blockchain_id === electionIdNum,
      );
      if (!election) {
        return res.status(404).json({
          status: "error",
          message: "Election not found",
        });
      }

      // Check election details on-chain
      const details = await getElectionDetails(
        condominium.contract_address,
        electionIdNum,
      );
      if (!details) {
        return res.status(500).json({
          status: "error",
          message: "Could not fetch election details from blockchain",
        });
      }

      if (!details.hasExpired) {
        return res.status(400).json({
          status: "error",
          message: "Election is still ongoing and cannot be closed yet",
        });
      }

      if (!details.isActive) {
        return res
          .status(400)
          .json({ status: "error", message: "Election is already closed" });
      }

      let txHash: string;
      try {
        txHash = await closeElection(
          condominium.contract_address,
          electionIdNum,
        );
      } catch (err: any) {
        console.error("Error closing election (on-chain):", err);
        // Extract useful information from the error for debugging
        const short =
          err?.shortMessage ||
          err?.message ||
          "Unknown error during on-chain call";
        return res.status(500).json({
          status: "error",
          message: `Failed to close election on-chain: ${short}`,
          debug: { error: err?.toString?.() },
        });
      }

      res.json({
        status: "success",
        message: "Election closed successfully",
        transactionHash: txHash,
      });
    } catch (error) {
      console.error("Error closing election:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to close election",
      });
    }
  },
);

export default router;
