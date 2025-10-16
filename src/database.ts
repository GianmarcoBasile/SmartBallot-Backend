import * as mongoDB from "mongodb";
import dotenv from "dotenv";
import type { CONDOMINIUM, USER } from "./types.js";

dotenv.config();

// Function to connect to the MongoDB database
export async function connectToDatabase(): Promise<mongoDB.Db> {
  const client: mongoDB.MongoClient = new mongoDB.MongoClient(
    process.env.DB_CONNECTION_STRING || "",
  );
  await client.connect();
  return client.db(process.env.DB_NAME);
}

// Returns the users collection from the database
export async function getUsersCollection(): Promise<mongoDB.Collection<USER>> {
  const db = await connectToDatabase();
  return db.collection("users");
}

// Returns the condominiums collection from the database
export async function getCondominiumsCollection(): Promise<
  mongoDB.Collection<CONDOMINIUM>
> {
  const db = await connectToDatabase();
  return db.collection("condominiums");
}
