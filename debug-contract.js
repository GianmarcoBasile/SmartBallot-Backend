const { ethers } = require('ethers');

async function getCorrectAddress() {
  try {
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Hash della transazione dal log che hai mostrato
    const txHash = '0x5412de7d8edbdba78210d670fc144f662665cdd3ce1ba1df8492a8bc179184a1';
    
    console.log('Getting transaction receipt for:', txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.error('Transaction not found!');
      return;
    }
    
    console.log('Transaction found, parsing logs...');
    
    // ABI della factory per parsare gli eventi
    const factoryABI = [
      'event CondominiumContractCreated(string indexed condominiumId, address contractAddress, address admin)'
    ];
    
    const iface = new ethers.Interface(factoryABI);
    
    receipt.logs.forEach((log, index) => {
      try {
        const parsed = iface.parseLog(log);
        console.log(`Event ${index}:`, parsed.name);
        if (parsed.name === 'CondominiumContractCreated') {
          console.log('🎯 FOUND CONTRACT:');
          console.log('  Contract Address:', parsed.args.contractAddress);
          console.log('  Condominium ID:', parsed.args.condominiumId);  
          console.log('  Admin:', parsed.args.admin);
        }
      } catch (error) {
        // Non è un evento della factory
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getCorrectAddress();