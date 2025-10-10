import * as mongoDB from "mongodb";
import { getCondominiumsCollection } from "../database.js";
import type { CONDOMINIUM, ELECTION, USER } from "../types.js";
import { ethers } from "ethers";
import { PRIVATE_KEY, RPC_URL, FACTORY_ADDRESS, SEMAPHORE_ADDRESS, FACTORY_ABI } from "../utils";

if (!PRIVATE_KEY || PRIVATE_KEY.length !== 66 || !PRIVATE_KEY.startsWith("0x")) {
  throw new Error("Chiave privata del wallet del backend non valida o mancante");
}

if (!RPC_URL) {
  throw new Error("URL del nodo blockchain non valido o mancante");
}

if (!/^0x[a-fA-F0-9]{40}$/.test(FACTORY_ADDRESS)) {
  throw new Error("Indirizzo del contratto Factory non valido");
}

if (!/^0x[a-fA-F0-9]{40}$/.test(SEMAPHORE_ADDRESS)) {
  throw new Error("Indirizzo del contratto Semaphore non valido");
}

export async function registerCondominium(condominium: CONDOMINIUM): Promise<mongoDB.InsertOneResult<mongoDB.Document>> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const result = await collection.insertOne(condominium);

  // Gestione creazione condominio su blockchain
  try {
    if (!condominium.admin) {
      throw new Error("Amministratore del condominio mancante");
    }
    
    if (!condominium.admin.wallet_address) {
      throw new Error("Indirizzo wallet dell'amministratore mancante");
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(condominium.admin.wallet_address)) {
      throw new Error("Indirizzo wallet dell'amministratore non valido");
    }

    if(result.acknowledged) {

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);

      if (typeof factoryContract.createCondominiumVoting !== "function") {
        throw new Error("Funzione createCondominiumVoting non trovata nell'ABI");
      }

      const tx = await factoryContract.createCondominiumVoting(result.insertedId.toString(), SEMAPHORE_ADDRESS, condominium.admin.wallet_address);

      const receipt = await tx.wait();

      console.log(`Contratto condominio creato: ${receipt.hash}`);

      await collection.updateOne(
          { _id: result.insertedId },
          { $set: { contractAddress: receipt.contractAddress } }
        );
    }
  } catch (error) {
    console.error("Errore durante la creazione del contratto condominio sulla blockchain:", error);
  }
  return result;
}

  export async function findCondominiumById(condominium_id: string): Promise<CONDOMINIUM | null> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne({ _id: new mongoDB.ObjectId(condominium_id) });
  const condominium:CONDOMINIUM|null = condominiumDocument ? {
    _id: condominiumDocument._id,
    name: condominiumDocument.name,
    address: condominiumDocument.address,
    totalUnits: condominiumDocument.totalUnits,
    city: condominiumDocument.city,
    postalCode: condominiumDocument.postalCode,
    province: condominiumDocument.province,
    taxCode: condominiumDocument.taxCode,
    admin: condominiumDocument.admin,
    users: condominiumDocument.users,
    description: condominiumDocument.description,
    elections: condominiumDocument.elections
  } : null;
  return condominium;
}

export async function findCondominiumByTaxCode(condominium_taxcode: string): Promise<CONDOMINIUM | null> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne({ condominium_taxcode });
  const condominium:CONDOMINIUM|null = condominiumDocument ? {
    name: condominiumDocument.name,
    address: condominiumDocument.address,
    totalUnits: condominiumDocument.totalUnits,
    city: condominiumDocument.city,
    postalCode: condominiumDocument.postalCode,
    province: condominiumDocument.province,
    taxCode: condominiumDocument.taxCode,
    admin: condominiumDocument.admin,
    users: condominiumDocument.users,
    description: condominiumDocument.description,
    elections: condominiumDocument.elections
  } : null;
  return condominium;
}

export async function addResidentToCondominium(condominium_id: string, resident: { full_name: string; email: string; tax_code: string; unit: string; role: string; join_date: string; }): Promise<mongoDB.UpdateResult> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const result = await collection.updateOne(
    { _id: new mongoDB.ObjectId(condominium_id) },
    { $push: { users: resident } }
  );
  return result;
}

export async function removeResidentFromCondominium(condominium_taxcode: string, resident_tax_code: string): Promise<mongoDB.UpdateResult> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const result = await collection.updateOne(
    { condominium_taxcode },
    { $pull: { users: { tax_code: resident_tax_code } } }
  );
  return result;
}

export async function getCondominiumsFromUser(user_tax_code: string): Promise<CONDOMINIUM[]> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const condominiumsCursor = collection.find({ "users.tax_code": user_tax_code });
  const condominiums: CONDOMINIUM[] = await condominiumsCursor.toArray();
  return condominiums;
}

export async function createCondominiumElection(condominium_id: string, election: ELECTION): Promise<mongoDB.UpdateResult> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const result = await collection.updateOne(
    {_id: new mongoDB.ObjectId(condominium_id)},
    { $push: {elections: election}}
  );
  return result;
}

export async function getCondominiumResidents(condominium_id: string): Promise<USER[]> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne({ _id: new mongoDB.ObjectId(condominium_id) });
  const residents: USER[] = condominiumDocument ? condominiumDocument.users.map((resident: USER) => ({
      id: resident._id,
      full_name: resident.full_name,
      email: resident.email,
      tax_code: resident.tax_code,
      birth_date: resident.birth_date,
      birth_place: resident.birth_place,
      condominiums: resident.condominiums,
      created_at: resident.created_at,
      last_login: resident.last_login,
      identity_commitment: resident.identity_commitment
  })) : [];
  return residents;
}
