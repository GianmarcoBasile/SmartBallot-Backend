import * as mongoDB from "mongodb";
import { getCondominiumsCollection } from "../database.js";
import type { CONDOMINIUM } from "../types.js";

export async function registerCondominium(condominium: CONDOMINIUM): Promise<mongoDB.InsertOneResult<mongoDB.Document>> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const result = await collection.insertOne(condominium);
  return result;
}

  export async function findCondominiumById(condominium_id: string): Promise<CONDOMINIUM | null> {
  const collection: mongoDB.Collection<CONDOMINIUM> = await getCondominiumsCollection();
  const condominiumDocument: mongoDB.Document | null = await collection.findOne({ _id: new mongoDB.ObjectId(condominium_id) });
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
    description: condominiumDocument.description
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
    description: condominiumDocument.description
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
