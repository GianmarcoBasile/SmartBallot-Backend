import * as mongoDB from "mongodb";
import { getUsersCollection } from "../database.js";
import type { USER } from "../types.js";
import { hashPassword } from "../utils/password.js";

export async function addUser(user: USER): Promise<mongoDB.InsertOneResult<mongoDB.Document>> {
  const collection: mongoDB.Collection = await getUsersCollection();
  const hashedPassword = await hashPassword(user.password);
  const result = await collection.insertOne({ ...user, password: hashedPassword });
  return result;
}

export async function findUserByEmail(email: string): Promise<mongoDB.Document | null> {
  const collection: mongoDB.Collection = await getUsersCollection();
  return collection.findOne({ email });
}

export async function findUserByTaxCode(tax_code: string): Promise<mongoDB.Document | null> {
  const collection: mongoDB.Collection = await getUsersCollection();
  return collection.findOne({ tax_code });
}

export async function isUserRegistered(email: string, tax_code?: string): Promise<boolean> {
  const collection: mongoDB.Collection = await getUsersCollection();
  const userByEmail = await collection.findOne({ email });
  const userByTaxCode = tax_code ? await collection.findOne({ tax_code }) : null;
  return !!(userByEmail || userByTaxCode);
}