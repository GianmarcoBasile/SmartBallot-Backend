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
  city: string;
  postalCode: string;
  province: string;
  taxCode: string;
  description?: string;
  totalUnits: number;
  admin: {
    full_name: string;
    email: string;
    tax_code: string;
  }
  users: {
    full_name: string;
    email: string;
    tax_code: string;
    unit: string;
    role: string;
    join_date: string;
  }[];
  _id?: ObjectId;
}