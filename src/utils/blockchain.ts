import { Group } from "@semaphore-protocol/group";
import { getCondominiumResidents } from "../services";
import { CONDOMINIUM, USER } from "../types";
import { ethers, toBigInt } from "ethers";
import { FACTORY_ABI, FACTORY_ADDRESS, PRIVATE_KEY, RPC_URL, SEMAPHORE_ADDRESS } from "./constants";

export async function createVotingGroup(condominiumId: string): Promise<Group> {
  const residents = await getCondominiumResidents(condominiumId);
  const identity_commitments: (string | undefined)[] = residents.map((resident: USER) => resident.identity_commitment);
  const group: Group = new Group(identity_commitments.map(commitment => toBigInt(commitment ?? '0')));
  return group;
}

export async function createCondominiumContract(
  condominiumId: string,
  adminAddress: string
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
      semaphoreAddress,
      adminAddress
    );

    // Aspetta la conferma della transazione
    const receipt = await tx.wait();

    // Estrai l'indirizzo del nuovo contratto dagli eventi
    const event = receipt.logs.find((log: any) => 
      log.topics[0] === ethers.id("CondominiumContractCreated(string,address,address)")
    );

    let contractAddress: string;
    if (event) {
      const decodedEvent = factory.interface.parseLog(event);
      if (!decodedEvent || decodedEvent.args.length < 2) {
        throw new Error("Impossibile decodificare l'evento");
      }
      contractAddress = decodedEvent.args[1]; // contractAddress è il secondo parametro
    } else {
      throw new Error("Evento di creazione contratto non trovato");
    }

    return contractAddress;

  } catch (error) {
    console.error('Errore nella creazione del contratto blockchain:', error);
    throw error;
  }
}