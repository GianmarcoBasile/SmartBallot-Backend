import { Group } from "@semaphore-protocol/group";
import { getCondominiumResidents } from "../services";
import { ELECTION, USER } from "../types";
import { ethers, toBigInt } from "ethers";
import {
  CONDOMINIUM_VOTING_ABI,
  FACTORY_ABI,
  FACTORY_ADDRESS,
  PRIVATE_KEY,
  RPC_URL,
  SEMAPHORE_ADDRESS,
} from "./constants";

// Create a Semaphore group from condominium residents
export async function createVotingGroup(condominiumId: string): Promise<Group> {
  const residents = await getCondominiumResidents(condominiumId);
  const identity_commitments: (string | undefined)[] = residents.map(
    (resident: USER) => resident.identity_commitment,
  );
  const group: Group = new Group(
    identity_commitments.map((commitment) => toBigInt(commitment ?? "0")),
  );
  return group;
}

// Create a new condominium contract on the blockchain
export async function createCondominiumContract(
  condominiumId: string,
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const factoryAddress = FACTORY_ADDRESS;
    const semaphoreAddress = SEMAPHORE_ADDRESS;

    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, wallet);

    if (typeof factory.createCondominiumVoting !== "function") {
      throw new Error("createCondominiumVoting function not found in contract");
    }

    const tx = await factory.createCondominiumVoting(
      condominiumId,
      semaphoreAddress,
    );

    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) =>
        log.topics[0] ===
        ethers.id("CondominiumContractCreated(string,address)"),
    );

    let contractAddress: string;
    if (event) {
      const decodedEvent = factory.interface.parseLog(event);
      if (!decodedEvent || decodedEvent.args.length < 2) {
        throw new Error("Unable to decode event data");
      }
      // args[1] is the contract address
      contractAddress = decodedEvent.args[1];
    } else {
      throw new Error("Contract creation event not found");
    }

    return contractAddress;
  } catch (error) {
    console.error("Error creating blockchain contract:", error);
    throw error;
  }
}

// Create a new election on the condominium contract
export async function createElectionOnBlockchain(
  contractAddress: string,
  election: ELECTION,
): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      wallet,
    );

    const duration = election.duration;

    if (duration <= 0) {
      throw new Error("Election duration must be positive");
    }

    // Convert options from string[] to Options[]
    const optionsStruct = election.options.map(
      (option: { id: number; name: string }, index: number) => ({
        id: option.id,
        name: option.name,
      }),
    );

    console.log("Creating election with parameters:", {
      name: election.name,
      options: optionsStruct,
      duration,
    });

    if (typeof condominiumContract.createElection !== "function") {
      throw new Error(
        "createElection function not found in condominium contract",
      );
    }

    const tx = await condominiumContract.createElection(
      election.name,
      optionsStruct,
      duration,
    );

    const receipt = await tx.wait();

    const electionCreatedEvent = receipt.logs.find((log: any) => {
      try {
        const parsedLog = condominiumContract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        return parsedLog?.name === "ElectionCreated";
      } catch {
        return false;
      }
    });

    if (!electionCreatedEvent) {
      throw new Error("ElectionCreated event not found");
    }

    const decodedEvent = condominiumContract.interface.parseLog({
      topics: electionCreatedEvent.topics,
      data: electionCreatedEvent.data,
    });

    if (!decodedEvent || decodedEvent.args.length < 1) {
      throw new Error("Unable to decode ElectionCreated event");
    }

    const blockchainElectionId = Number(decodedEvent.args[0]);
    console.log("Election created with blockchain ID:", blockchainElectionId);

    return blockchainElectionId;
  } catch (error) {
    console.error("Error creating election on contract:", error);
    throw error;
  }
}

// Add members to an existing election on the condominium contract
export async function addMembersToElection(
  contractAddress: string,
  electionId: number,
  memberCommitments: string[],
): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const condominiumContract = new ethers.Contract(
      contractAddress,
      CONDOMINIUM_VOTING_ABI,
      wallet,
    );

    const commitments = memberCommitments.map((c) => toBigInt(c));

    if (typeof condominiumContract.addMembersToElection !== "function") {
      throw new Error(
        "addMembersToElection function not found in condominium contract",
      );
    }

    const tx = await condominiumContract.addMembersToElection(
      electionId,
      commitments,
    );
    await tx.wait();

    console.log(`Members added to election ${electionId}`);
  } catch (error) {
    console.error("Error adding members to election:", error);
    throw error;
  }
}
