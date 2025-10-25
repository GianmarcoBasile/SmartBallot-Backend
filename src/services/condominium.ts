import * as mongoDB from "mongodb";
import { getCondominiumsCollection, getUsersCollection } from "../database.js";
import type { CONDOMINIUM, ELECTION, USER } from "../types.js";
import {
  addMembersToElection,
  createCondominiumContract,
  createElectionOnBlockchain,
} from "../utils/index.js";

// Register a new condominium and create its smart contract on the blockchain
export async function registerCondominium(
  condominium: CONDOMINIUM,
): Promise<mongoDB.InsertOneResult<mongoDB.Document>> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();

  if (await findCondominiumByTaxCode(condominium.taxCode)) {
    throw new Error("Condominium with this tax code already exists");
  }

  const result = await collection.insertOne(condominium);
  if (!result.acknowledged) {
    throw new Error("Failed to register condominium");
  }
  try {
    const contractAddress = await createCondominiumContract(
      result.insertedId.toString(),
    );

    await collection.updateOne(
      { _id: result.insertedId },
      { $set: { contract_address: contractAddress } },
    );

    console.log(`Condominium contract created at address: ${contractAddress}`);
  } catch (error) {
    console.error("Error creating condominium contract:", error);
    throw new Error("Failed to create condominium contract");
  }
  return result;
}

// Find a condominium by its ID
export async function findCondominiumById(
  condominium_id: string,
): Promise<CONDOMINIUM | null> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne(
    { _id: new mongoDB.ObjectId(condominium_id) },
  );
  const condominium: CONDOMINIUM | null = condominiumDocument
    ? {
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
        elections: condominiumDocument.elections,
        contract_address: condominiumDocument.contract_address,
      }
    : null;
  return condominium;
}

// Find a condominium by its tax code
export async function findCondominiumByTaxCode(
  condominium_taxcode: string,
): Promise<CONDOMINIUM | null> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne(
    { taxCode: condominium_taxcode },
  );
  const condominium: CONDOMINIUM | null = condominiumDocument
    ? {
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
        elections: condominiumDocument.elections,
        contract_address: condominiumDocument.contract_address,
      }
    : null;
  return condominium;
}

// Add a resident to a condominium and update the user's condominiums list
export async function addResidentToCondominium(
  condominium_id: string,
  resident: {
    full_name: string;
    email: string;
    tax_code: string;
    unit: string;
    role: string;
    join_date: string;
  },
): Promise<mongoDB.UpdateResult> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();
  const result = await collection.updateOne(
    { _id: new mongoDB.ObjectId(condominium_id) },
    { $push: { users: resident } },
  );

  if (!result.acknowledged || result.matchedCount === 0) {
    throw new Error("Failed to add resident to condominium");
  }

  const updatedCondominium = await collection.findOne({
    _id: new mongoDB.ObjectId(condominium_id),
  });

  if (!updatedCondominium)
    throw new Error("Condominium not found after update");

  const collectionUsers: mongoDB.Collection<USER> = await getUsersCollection();
  await collectionUsers.updateOne(
    { tax_code: resident.tax_code },
    { $push: { condominiums: updatedCondominium } },
  );
  return result;
}

// Retrieve all condominiums associated with a user (as admin or resident)
export async function getCondominiumsFromUser(
  user_tax_code: string,
): Promise<CONDOMINIUM[]> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();

  const condominiumsCursor = collection.find({
    $or: [
      { "admin.tax_code": user_tax_code },
      { "users.tax_code": user_tax_code },
    ],
  });

  const condominiums: CONDOMINIUM[] = await condominiumsCursor.toArray();

  return condominiums.map(
    (doc) =>
      ({
        _id: doc._id,
        name: doc.name,
        address: doc.address,
        totalUnits: doc.totalUnits,
        city: doc.city,
        postalCode: doc.postalCode,
        province: doc.province,
        taxCode: doc.taxCode,
        admin: doc.admin,
        users: doc.users || [],
        description: doc.description,
        elections: doc.elections || [], // Ensure elections is always an array
        contract_address: doc.contract_address,
      }) as CONDOMINIUM,
  );
}

// Create a new election for a condominium, both on the blockchain and in the database
export async function createCondominiumElection(
  condominium_id: string,
  election: ELECTION,
): Promise<mongoDB.UpdateResult> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();

  const condominium = await findCondominiumById(condominium_id);
  if (!condominium) {
    throw new Error("Condominium not found");
  }

  if (!condominium.contract_address) {
    throw new Error("Condominium contract not deployed");
  }

  try {
    // Create the election on the smart contract
    const blockchainElectionId = await createElectionOnBlockchain(
      condominium.contract_address,
      election,
    );

    const residents = await getCondominiumResidents(condominium_id);

    const memberCommitments = residents
      .filter((r) => r.identity_commitment)
      .map((r) => r.identity_commitment!);

    console.log(
      `Adding ${memberCommitments.length} members to blockchain group...`,
    );

    if (memberCommitments.length > 0) {
      try {
        await addMembersToElection(
          condominium.contract_address,
          blockchainElectionId,
          memberCommitments,
        );
        console.log("Members added successfully to blockchain!");
      } catch (error) {
        console.error("Failed to add members to blockchain group");
      }
    } else {
      console.log("No identity commitments found - group will be empty!");
    }

    // Add the blockchain ID to the election object
    const electionWithBlockchainId = {
      ...election,
      blockchain_id: blockchainElectionId,
    };

    // Save the election in the database
    const result = await collection.updateOne(
      { _id: new mongoDB.ObjectId(condominium_id) },
      { $push: { elections: electionWithBlockchainId } },
    );

    console.log(
      `Election created on blockchain with ID: ${blockchainElectionId}`,
    );
    return result;
  } catch (error) {
    console.error("Error creating election on blockchain:", error);
    throw new Error("Failed to create election on blockchain");
  }
}

// Retrieve all residents of a condominium, including their identity commitments
export async function getCondominiumResidents(
  condominium_id: string,
): Promise<USER[]> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne(
    { _id: new mongoDB.ObjectId(condominium_id) },
  );

  if (!condominiumDocument) {
    throw new Error("Condominium not found");
  }

  const allTaxCodes: string[] = [];

  if (condominiumDocument.users) {
    condominiumDocument.users.forEach((user: USER) => {
      allTaxCodes.push(user.tax_code);
    });
  }

  // Retrieve all users with their identity commitments
  const usersCollection = await getUsersCollection();
  const usersWithCommitments = await usersCollection
    .find({
      tax_code: { $in: allTaxCodes },
    })
    .toArray();

  return usersWithCommitments.map(
    (user) =>
      ({
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        tax_code: user.tax_code,
        birth_date: user.birth_date,
        birth_place: user.birth_place,
        condominiums: user.condominiums || [],
        created_at: user.created_at,
        last_login: user.last_login,
        identity_commitment: user.identity_commitment,
        password: user.password,
      }) as USER,
  );
}

// Check if a user is the admin of a specific condominium
export async function isCondominiumAdmin(
  condominiumId: string,
  userTaxCode: string,
): Promise<boolean> {
  const collection: mongoDB.Collection<CONDOMINIUM> =
    await getCondominiumsCollection();
  const condominium = await collection.findOne({
    _id: new mongoDB.ObjectId(condominiumId),
    "admin.tax_code": userTaxCode,
  });
  return !!condominium;
}
