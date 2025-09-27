import * as mongoDB from "mongodb";
import dotenv from "dotenv";
import type { USER } from "./types.js";

dotenv.config();

export async function connectToDatabase(): Promise<mongoDB.Db> {
  const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.DB_CONNECTION_STRING || "");
  await client.connect();
  return client.db(process.env.DB_NAME);
}

export async function getUsersCollection(): Promise<mongoDB.Collection<USER>> {
  const db = await connectToDatabase();
  return db.collection("users");
}

export async function getCondominiumsColletion(): Promise<mongoDB.Collection> {
  const db = await connectToDatabase();
  return db.collection("condominiums");
}