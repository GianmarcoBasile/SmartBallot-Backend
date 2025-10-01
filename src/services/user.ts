import * as mongoDB from "mongodb";
import { getUsersCollection } from "../database.js";
import type { CONDOMINIUM, USER } from "../types.js";
import { hashPassword } from "../utils/password.js";

export async function registerUser(user: USER): Promise<mongoDB.InsertOneResult<mongoDB.Document>> {
  const collection: mongoDB.Collection<USER> = await getUsersCollection();
  const hashedPassword = await hashPassword(user.password? user.password : "");
  const result = await collection.insertOne({ ...user, password: hashedPassword, created_at: new Date().toLocaleDateString('it-IT'), last_login: new Date().toLocaleDateString('it-IT')});
  return result;
}

export async function findUserByEmail(email: string): Promise<USER | null> {
  const collection: mongoDB.Collection<USER> = await getUsersCollection();
  const userDocument: mongoDB.Document | null = await collection.findOne({ email });
  const user:USER|null = userDocument ? {
    full_name: userDocument.full_name,
    email: userDocument.email,
    tax_code: userDocument.tax_code,
    password: userDocument.password,
    birth_date: userDocument.birth_date,
    birth_place: userDocument.birth_place,
    condominiums: userDocument.condominiums,
    created_at: userDocument.created_at,
    last_login: userDocument.last_login
  } : null;
  return user;
}

export async function findUserByTaxCode(tax_code: string): Promise<USER | null> {
  const collection: mongoDB.Collection<USER> = await getUsersCollection();
  const userDocument: mongoDB.Document | null = await collection.findOne({ tax_code });
  const user:USER|null = userDocument ? {
    full_name: userDocument.full_name,
    email: userDocument.email,
    tax_code: userDocument.tax_code,
    birth_date: userDocument.birth_date,
    birth_place: userDocument.birth_place,
    condominiums: userDocument.condominiums,
    created_at: userDocument.created_at,
    last_login: userDocument.last_login
  } : null;
  return user;
}

export async function isUserRegistered(email: string, tax_code?: string): Promise<boolean> {
  const collection: mongoDB.Collection<USER> = await getUsersCollection();
  const userByEmail = await collection.findOne({ email });
  const userByTaxCode = tax_code ? await collection.findOne({ tax_code }) : null;
  return !!(userByEmail || userByTaxCode);
}

export async function getUserCondominiums(tax_code: string): Promise<CONDOMINIUM[]> {
  const user = await findUserByTaxCode(tax_code);
  return user ? user.condominiums : [];
}

export async function addCondominiumToUser(tax_code: string, condominium: CONDOMINIUM): Promise<mongoDB.UpdateResult> {
  const collection: mongoDB.Collection<USER> = await getUsersCollection();
  const result = await collection.updateOne(
    { tax_code },
    { $push: { condominiums: condominium } }
  );
  return result;
}

export async function updateLastLogin(email: string): Promise<mongoDB.UpdateResult> {
  const collection: mongoDB.Collection<USER> = await getUsersCollection();
  const result = await collection.updateOne(
    { email },
    { $set: { last_login: new Date().toLocaleDateString('it-IT') } }
  );
  return result;
}

