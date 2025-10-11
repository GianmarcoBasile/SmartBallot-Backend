const ethers = require('ethers');
const dotenv = require('dotenv');
const path = require('path');

// Carica .env (il file si trova in backend/.env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SEMAPHORE_ADDRESS = process.env.SEMAPHORE_ADDRESS;
const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// ABI minimale per leggere l'admin di un gruppo
const SEMAPHORE_ABI = [
  'function getGroupAdmin(uint256) view returns (address)'
];

async function checkGroupAdmin(groupId) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const semaphore = new ethers.Contract(SEMAPHORE_ADDRESS, SEMAPHORE_ABI, provider);

  try {
    const admin = await semaphore.getGroupAdmin(groupId);
    console.log('Admin del gruppo:', admin);
    console.log('Backend wallet:', BACKEND_WALLET_ADDRESS);
    if (admin && BACKEND_WALLET_ADDRESS && admin.toLowerCase() === BACKEND_WALLET_ADDRESS.toLowerCase()) {
      console.log("✅ L'admin del gruppo è il backend!");
    } else {
      console.log("❌ L'admin del gruppo NON è il backend!");
    }
  } catch (err) {
    console.error("Errore durante la lettura dell'admin:", err);
    process.exitCode = 1;
  }
}

// Esempio di utilizzo: node checkGroupAdmin.js <groupId>
if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node checkGroupAdmin.js <groupId>');
    process.exit(1);
  }
  const groupId = Number(arg);
  checkGroupAdmin(groupId).then(() => process.exit(0)).catch(() => process.exit(1));
}
