import { Router, type Request, type Response } from "express";
import { submitVote, getElectionResults, getElectionDetails, closeElection } from "../services/voting.js";
import { findCondominiumById } from "../services/condominium.js";
import { requireAuth, requireCondominiumAdmin, type AuthenticatedRequest } from "../middleware/auth.js";
import { getUsersCollection } from "../database.js";

const router: Router = Router();

// Sottomettere un voto
router.post('/:condominiumId/elections/:electionId/vote', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const condominiumId = req.params.condominiumId;
    const electionId = req.params.electionId;
    const { optionIndex, proof } = req.body;
    
    // Validazione parametri URL
    if (!condominiumId || !electionId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Condominium ID and Election ID are required' 
      });
    }
    
    // Validazione input
    if (!proof) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Semaphore proof is required' 
      });
    }

    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Option index is required' 
      });
    }

    // Ottieni il contratto del condominio
    const condominium = await findCondominiumById(condominiumId);
    if (!condominium || !condominium.contract_address) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Condominium contract not found' 
      });
    }

    // Verifica che l'elezione esista
    const electionIdNum = parseInt(electionId);
    
    let election = condominium.elections?.find(e => e.blockchain_id === electionIdNum);
    
    if (!election) {
      return res.status(404).json({ 
        status: 'error', 
        message: `Election with blockchain_id ${electionIdNum} not found. Available elections: ${condominium.elections?.length || 0}` 
      });
    }

    // Verifica che l'opzione esista
    const optionIndexNum = parseInt(optionIndex);
    if (optionIndexNum >= election.options.length || optionIndexNum < 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid option index' 
      });
    }

    // Sottometti il voto
    const txHash = await submitVote(
      condominium.contract_address,
      electionIdNum,
      optionIndexNum,
      proof
    );

    res.json({ 
      status: 'success',
      message: 'Vote submitted successfully',
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to submit vote' 
    });
  }
});

// Ottenere i risultati di un'elezione
router.get('/:condominiumId/elections/:electionId/results', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const condominiumId = req.params.condominiumId;
    const electionId = req.params.electionId;

    if (!condominiumId || !electionId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Condominium ID and Election ID are required' 
      });
    }

    const condominium = await findCondominiumById(condominiumId);
    if (!condominium || !condominium.contract_address) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Condominium contract not found' 
      });
    }

    const electionIdNum = parseInt(electionId);
    const election = condominium.elections?.find(e => e.blockchain_id === electionIdNum);
    if (!election) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Election not found' 
      });
    }

    // Ottieni i risultati dalla blockchain
    const results = await getElectionResults(
      condominium.contract_address,
      electionIdNum,
      election.options.length
    );

    // Combina con i nomi delle opzioni
    const detailedResults = results.map(result => ({
      optionIndex: result.optionIndex,
      optionName: election.options[result.optionIndex]?.name || `Option ${result.optionIndex}`,
      voteCount: result.voteCount
    }));

    // Calcola il totale dei voti
    const totalVotes = results.reduce((sum, result) => sum + result.voteCount, 0);

    res.json({ 
      status: 'success',
      results: detailedResults,
      totalVotes,
      election: {
        name: election.name,
        blockchain_id: election.blockchain_id,
        options: election.options
      }
    });

  } catch (error) {
    console.error('Error getting election results:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to get election results' 
    });
  }
});



// Ottenere dettagli di un'elezione
router.get('/:condominiumId/elections/:electionId/details', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const condominiumId = req.params.condominiumId;
    const electionId = req.params.electionId;

    if (!condominiumId || !electionId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Condominium ID and Election ID are required' 
      });
    }

    const condominium = await findCondominiumById(condominiumId);
    if (!condominium || !condominium.contract_address) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Condominium contract not found' 
      });
    }

    const electionIdNum = parseInt(electionId);
    const election = condominium.elections?.find(e => e.blockchain_id === electionIdNum);
    if (!election) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Election not found' 
      });
    }

    const details = await getElectionDetails(
      condominium.contract_address,
      electionIdNum
    );

    res.json({ 
      status: 'success', 
      details: {
        ...details,
        name: election.name,
        description: election.description,
        options: election.options
      }
    });

  } catch (error) {
    console.error('Error getting election details:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to get election details' 
    });
  }
});

// Chiudere un'elezione (solo per admin)
// Ottieni il gruppo Semaphore per un condominio
router.get('/:condominiumId/group', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const condominiumId = req.params.condominiumId;
    
    if (!condominiumId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Condominium ID is required' 
      });
    }

    // Ottieni il condominio
    const condominium = await findCondominiumById(condominiumId);
    if (!condominium) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Condominium not found' 
      });
    }

    // Estrai gli identity commitment di tutti gli utenti del condominio
    const identityCommitments: string[] = [];
    const usersCollection = await getUsersCollection();
    
    // Collect all tax codes from the condominium users (exclude administrator)
    const allTaxCodes: string[] = [];
    if (condominium.users) {
      condominium.users.forEach(user => {
        allTaxCodes.push(user.tax_code);
      });
    }

    // Fetch identity_commitment from users collection for all participants
    const users = await usersCollection.find({ 
      tax_code: { $in: allTaxCodes } 
    }).toArray();

    users.forEach(user => {
      if (user.identity_commitment) {
        identityCommitments.push(user.identity_commitment);
      }
    });

    res.json({ 
      status: 'success',
      group: identityCommitments
    });

  } catch (error) {
    console.error('Error getting Semaphore group:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to get Semaphore group' 
    });
  }
});

router.put('/:condominiumId/elections/:electionId/close', requireAuth, requireCondominiumAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const condominiumId = req.params.condominiumId;
    const electionId = req.params.electionId;

    if (!condominiumId || !electionId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Condominium ID and Election ID are required' 
      });
    }

    const condominium = await findCondominiumById(condominiumId);
    if (!condominium || !condominium.contract_address) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Condominium contract not found' 
      });
    }

    const electionIdNum = parseInt(electionId);
    const election = condominium.elections?.find(e => e.blockchain_id === electionIdNum);
    if (!election) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Election not found' 
      });
    }

    // Controllo preventivo: chiedi i dettagli dell'elezione sulla blockchain
    const details = await getElectionDetails(condominium.contract_address, electionIdNum);
    if (!details) {
      return res.status(500).json({ status: 'error', message: 'Could not fetch election details from blockchain' });
    }

    if (!details.hasExpired) {
      return res.status(400).json({ status: 'error', message: 'Election is still ongoing and cannot be closed yet' });
    }

    if (!details.isActive) {
      return res.status(400).json({ status: 'error', message: 'Election is already closed' });
    }

    let txHash: string;
    try {
      txHash = await closeElection(
        condominium.contract_address,
        electionIdNum
      );
    } catch (err: any) {
      console.error('Error closing election (on-chain):', err);
      // Estrapola informazioni utili dall'errore per debug
      const short = err?.shortMessage || err?.message || 'Unknown error during on-chain call';
      return res.status(500).json({ status: 'error', message: `Failed to close election on-chain: ${short}`, debug: { error: err?.toString?.() } });
    }

    res.json({ 
      status: 'success',
      message: 'Election closed successfully',
      transactionHash: txHash
    });

  } catch (error) {
    console.error('Error closing election:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to close election' 
    });
  }
});

export default router;