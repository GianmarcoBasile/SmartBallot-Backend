export const FACTORY_ADDRESS = process.env.CONTRACT_FACTORY_ADDRESS || "";
export const SEMAPHORE_ADDRESS = process.env.SEMAPHORE_ADDRESS || "";
export const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || "";
export const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
export const FACTORY_ABI = [
  "function createCondominiumVoting(string memory condominiumId, address semaphoreAddress, address admin) external returns (address)",
  "event CondominiumContractCreated(string indexed condominiumId, address contractAddress, address admin)"
];