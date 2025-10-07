import { Group } from "@semaphore-protocol/group";
import { getCondominiumResidents } from "../services";
import { USER } from "../types";
import { toBigInt } from "ethers";

export async function createVotingGroup(condominiumId: string): Promise<Group> {
  const residents = await getCondominiumResidents(condominiumId);
  const identity_commitments: (string | undefined)[] = residents.map((resident: USER) => resident.identity_commitment);
  const group: Group = new Group(identity_commitments.map(commitment => toBigInt(commitment ?? '0')));
  return group;
}