import { ethers } from "ethers";
import { CONDOMINIUM_VOTING_ABI, PRIVATE_KEY, RPC_URL } from "../utils/constants.js";

export interface SemaphoreProof {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
}

export async function submitVote(
  contractAddress: string,
  electionId: number,
  optionIndex: number,
  proof: SemaphoreProof
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      wallet
    );

    // Verifica che la funzione vote esista
    if (typeof condominiumContract.vote !== 'function') {
      throw new Error('Vote function not found in contract');
    }

    // Converti la proof nel formato atteso dal contratto
    const formattedProof = {
      merkleTreeDepth: proof.merkleTreeDepth,
      merkleTreeRoot: proof.merkleTreeRoot,
      nullifier: proof.nullifier,
      message: proof.message,
      scope: proof.scope,
      points: proof.points
    };

    // Chiama la funzione vote del contratto
    const tx = await condominiumContract.vote(electionId, optionIndex, formattedProof);
    const receipt = await tx.wait();
    
    console.log(`Vote submitted for election ${electionId}, option ${optionIndex}, tx: ${tx.hash}`);
    return tx.hash;
    
  } catch (error) {
    console.error("Error submitting vote:", error);
    throw error;
  }
}

export async function getElectionResults(
  contractAddress: string,
  electionId: number,
  optionsCount: number
): Promise<{ optionIndex: number; voteCount: number }[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      provider // Solo lettura, non serve wallet
    );

    if (typeof condominiumContract.getVoteCount !== 'function') {
      throw new Error('getVoteCount function not found in contract');
    }

    const results = [];
    
    // Ottieni i voti per ogni opzione
    for (let i = 0; i < optionsCount; i++) {
      try {
        const voteCount = await condominiumContract.getVoteCount(electionId, i);
        results.push({
          optionIndex: i,
          voteCount: Number(voteCount)
        });
      } catch (error) {
        console.warn(`Could not get vote count for option ${i}:`, error);
        results.push({
          optionIndex: i,
          voteCount: 0
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error("Error getting election results:", error);
    throw error;
  }
}

export async function getElectionDetails(
  contractAddress: string,
  electionId: number
): Promise<{ hasExpired: boolean; isActive: boolean; endTime: number }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      provider
    );

    if (typeof condominiumContract.getElectionDetails !== 'function') {
      throw new Error('getElectionDetails function not found in contract');
    }

    const details = await condominiumContract.getElectionDetails(electionId);
    
    // Il contratto dovrebbe restituire: name, options, voteCounts, endTime, active, groupId, hasExpired
    const currentTime = Math.floor(Date.now() / 1000);
    const hasExpired = details.hasExpired || (details.endTime && details.endTime < currentTime);
    
    return {
      hasExpired,
      isActive: details.active && !hasExpired,
      endTime: Number(details.endTime || 0)
    };
    
  } catch (error) {
    console.error("Error getting election details:", error);
    throw error;
  }
}

export async function closeElection(
  contractAddress: string,
  electionId: number
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      wallet
    );

    if (typeof condominiumContract.closeElection !== 'function') {
      throw new Error('closeElection function not found in contract');
    }

    console.log(`Closing election ${electionId}`);
      try {
        const tx = await condominiumContract.closeElection(electionId);
        await tx.wait();

        console.log(`Election ${electionId} closed, tx: ${tx.hash}`);
        return tx.hash;
      } catch (error: any) {
        console.error('Error closing election (service):', error);
        if (error?.info) {
          console.error('Error info:', error.info);
        }
        throw error;
      }
  } catch (error) {
    console.error("Error closing election:", error);
    throw error;
  }
}