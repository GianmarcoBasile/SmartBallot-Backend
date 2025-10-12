export const FACTORY_ADDRESS = process.env.CONTRACT_FACTORY_ADDRESS || "";
export const SEMAPHORE_ADDRESS = process.env.SEMAPHORE_ADDRESS || "";
export const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || "";
export const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
export const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS || "";

export const FACTORY_ABI = [
  "function createCondominiumVoting(string memory condominiumId, address semaphoreAddress) external returns (address)",
  "event CondominiumContractCreated(string indexed condominiumId, address contractAddress)"
];

export const CONDOMINIUM_VOTING_ABI = [
  // Constructor
  "constructor(address semaphoreAddress)",
  
  // Public variables (Solidity genera automaticamente getter)
  "function semaphore() external view returns (address)",
  "function electionCount() external view returns (uint256)",
  "function elections(uint256) external view returns (uint256 groupId, string name, uint256 endTime, bool active)",
  
  // Funzioni view/pure
  "function getAllElections() external view returns (tuple(uint256 id, string name, bool active, bool hasExpired, uint256 endTime, uint256 optionCount)[])",
  "function getVoteCount(uint256 electionId, uint256 optionIndex) external view returns (uint256)",
  "function getElectionDetails(uint256 electionId) external view returns (string name, string[] options, uint256[] voteCounts, uint256 endTime, bool active, uint256 groupId, bool hasExpired)",
  "function getElectionOptions(uint256 electionId) external view returns (tuple(uint256 id, string name)[])",
  
  // Funzioni che modificano lo stato
  "function createElection(string memory name, tuple(uint256 id, string name)[] memory options, uint256 duration) external returns (uint256)",
  "function closeElection(uint256 electionId) external",
  "function vote(uint256 electionId, uint256 optionIndex, tuple(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points) proof) external",
  "function addMembersToElection(uint256 electionId, uint256[] calldata identityCommitments) external",
  
  // Eventi
  "event ElectionCreated(uint256 indexed electionId, string name)",
  "event VoteCast(uint256 indexed electionId, uint256 indexed optionIndex)",
  "event ElectionClosed(uint256 indexed electionId)",
  "event MembersAdded(uint256 indexed electionId, uint256 memberCount)"
];