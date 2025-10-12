import { Group } from "@semaphore-protocol/group";
import { getCondominiumResidents } from "../services";
import { ELECTION, USER } from "../types";
import { ethers, toBigInt } from "ethers";
import { CONDOMINIUM_VOTING_ABI, FACTORY_ABI, FACTORY_ADDRESS, PRIVATE_KEY, RPC_URL, SEMAPHORE_ADDRESS, BACKEND_WALLET_ADDRESS } from "./constants";

export async function createVotingGroup(condominiumId: string): Promise<Group> {
  const residents = await getCondominiumResidents(condominiumId);
  const identity_commitments: (string | undefined)[] = residents.map((resident: USER) => resident.identity_commitment);
  const group: Group = new Group(identity_commitments.map(commitment => toBigInt(commitment ?? '0')));
  return group;
}

export async function createCondominiumContract(
  condominiumId: string,
): Promise<string> {
  try {
    // Configura il provider e il wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Indirizzi dei contratti (da variabili d'ambiente)
    const factoryAddress = FACTORY_ADDRESS;
    const semaphoreAddress = SEMAPHORE_ADDRESS

    // Crea l'istanza del contratto factory
    const factory = new ethers.Contract(
      factoryAddress,
      FACTORY_ABI,
      wallet
    );

    if (typeof factory.createCondominiumVoting !== 'function') {
      throw new Error('createCondominiumVoting non è una funzione valida nel contratto factory');
    }
    
    // Chiama la funzione per creare il contratto del condominio
    const tx = await factory.createCondominiumVoting(
      condominiumId,
      semaphoreAddress
    );

    // Aspetta la conferma della transazione
    const receipt = await tx.wait();

    // Estrai l'indirizzo del nuovo contratto dagli eventi
    const event = receipt.logs.find((log: any) => 
      log.topics[0] === ethers.id("CondominiumContractCreated(string,address)")
    );

    let contractAddress: string;
    if (event) {
      const decodedEvent = factory.interface.parseLog(event);
      if (!decodedEvent || decodedEvent.args.length < 2) {
        throw new Error("Impossibile decodificare l'evento");
      }
      // args[0] is the indexed condominiumId (an indexed dynamic type => decoded as an indexed object)
      // args[1] is the contract address
      contractAddress = decodedEvent.args[1];
    } else {
      throw new Error("Evento di creazione contratto non trovato");
    }

    return contractAddress;

  } catch (error) {
    console.error('Errore nella creazione del contratto blockchain:', error);
    throw error;
  }
}

export async function createElectionOnBlockchain(
  contractAddress: string,
  election: ELECTION
): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      wallet
    );
    
    const duration = election.duration;
    
    if (duration <= 0) {
      throw new Error("Election duration must be positive");
    }
    
    // Converti le options da string[] a Options[]
    const optionsStruct = election.options.map((option: { id: number; name: string; }, index: number) => ({
      id: option.id,
      name: option.name
    }));
    
    console.log("Creating election with parameters:", {
      name: election.name,
      options: optionsStruct,
      duration
    });

    if (typeof condominiumContract.createElection !== 'function') {
      throw new Error('createElection non è una funzione valida nel contratto del condominio');
    }

    // Chiama la funzione con i parametri corretti (senza description)
    const tx = await condominiumContract.createElection(
      election.name,
      optionsStruct,
      duration
    );
    
    const receipt = await tx.wait();
    
    const electionCreatedEvent = receipt.logs.find((log: any) => {
      try {
        const parsedLog = condominiumContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return parsedLog?.name === 'ElectionCreated';
      } catch {
        return false;
      }
    });
    
    if (!electionCreatedEvent) {
      throw new Error("ElectionCreated event not found");
    }
    
    const decodedEvent = condominiumContract.interface.parseLog({
      topics: electionCreatedEvent.topics,
      data: electionCreatedEvent.data
    });

    if (!decodedEvent || decodedEvent.args.length < 1) {
      throw new Error("Unable to decode ElectionCreated event");
    }
    
    const blockchainElectionId = Number(decodedEvent.args[0]);
    console.log("Election created with blockchain ID:", blockchainElectionId);
    
    return blockchainElectionId;
    
  } catch (error) {
    console.error("Error creating election on contract:", error);
    throw error;
  }
}

export async function addMembersToElection(
  contractAddress: string,
  electionId: number,
  memberCommitments: string[]
): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      wallet
    );
    
    // Converti i commitment in BigInt
    const commitments = memberCommitments.map(c => toBigInt(c));
    
    if (typeof condominiumContract.addMembersToElection !== 'function') {
      throw new Error('addMembersToElection non è una funzione valida nel contratto del condominio');
    }

    const tx = await condominiumContract.addMembersToElection(electionId, commitments);
    await tx.wait();
    
    console.log(`Members added to election ${electionId}`);
    
  } catch (error) {
    console.error("Error adding members to election:", error);
    throw error;
  }
}