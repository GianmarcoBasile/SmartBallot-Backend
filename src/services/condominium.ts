import * as mongoDB from "mongodb";
import { getCondominiumsColletion } from "../database.js";
import type { CONDOMINIUM } from "../types.js";

export async function registerCondominium(condominium: CONDOMINIUM): Promise<mongoDB.InsertOneResult<mongoDB.Document>> {
  const collection: mongoDB.Collection = await getCondominiumsColletion();
  const result = await collection.insertOne(condominium);
  return result;
}

export async function findCondominiumByTaxCode(condominium_taxcode: string): Promise<CONDOMINIUM | null> {
  const collection: mongoDB.Collection = await getCondominiumsColletion();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne({ condominium_taxcode });
  const condominium:CONDOMINIUM|null = condominiumDocument ? {
    name: condominiumDocument.name,
    address: condominiumDocument.address,
    condominium_taxcode: condominiumDocument.condominium_taxcode,
    num_units: condominiumDocument.num_units,
    city: condominiumDocument.city,
    postal_code: condominiumDocument.postal_code,
    province: condominiumDocument.province,
    country: condominiumDocument.country,
    admin: condominiumDocument.admin,
    users_taxcodes: condominiumDocument.users_taxcodes,
    description: condominiumDocument.description
  } : null;
  return condominium;
}
