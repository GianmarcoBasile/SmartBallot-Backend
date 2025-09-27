import type { ObjectId } from "mongodb";

export interface USER {
  full_name: string;
  email: string;
  tax_code: string;
  password: string;
  birth_date: string;
  birth_place: string;
  condominiums: CONDOMINIUM[];
  _id?: ObjectId;
}

export interface CONDOMINIUM {
  name: string;
  address: string;
  condominium_taxcode: string;
  num_units: number;
  city: string;
  postal_code: string;
  province: string;
  country: string;
  users_taxcodes: string[];
  description?: string;
  admin: USER;
  _id?: ObjectId;
}