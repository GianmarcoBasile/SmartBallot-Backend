const ethers = require("ethers");
const dotenv = require("dotenv");
const path = require("path");

// Load backend .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

const ABI = [
  "function getElectionDetails(uint256) view returns (string name, string[] options, uint256[] voteCounts, uint256 endTime, bool active, uint256 groupId, bool hasExpired)",
  "function getVoteCount(uint256,uint256) view returns (uint256)",
];

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: node checkElectionVotes.js <contractAddress> <electionId>",
    );
    process.exit(1);
  }

  const [contractAddress, electionIdArg] = args;
  const electionId = Number(electionIdArg);
  if (Number.isNaN(electionId)) {
    console.error("Invalid electionId");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(contractAddress, ABI, provider);

  try {
    const details = await contract.getElectionDetails(electionId);
    const name = details[0];
    const options = details[1];
    const voteCounts = details[2];
    const endTime = details[3];
    const active = details[4];
    const groupId = details[5];
    const hasExpired = details[6];

    console.log("Election ID:", electionId);
    console.log("Name:", name);
    console.log(
      "Active:",
      active,
      "HasExpired:",
      hasExpired,
      "EndTime:",
      new Date(Number(endTime) * 1000).toString(),
    );
    console.log("Group ID:", groupId.toString());
    console.log("Options and vote counts:");

    if (!options || options.length === 0) {
      console.log("  (no options)");
      return;
    }

    for (let i = 0; i < options.length; i++) {
      // voteCounts might be shorter; fetch on-chain if missing
      let count =
        voteCounts && voteCounts[i] !== undefined ? voteCounts[i] : null;
      if (count === null) {
        try {
          count = await contract.getVoteCount(electionId, i);
        } catch (e) {
          count = "n/a";
        }
      }
      console.log(`  [${i}] ${options[i]} -> ${count.toString()}`);
    }
  } catch (err) {
    console.error("Error fetching election details:", err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
