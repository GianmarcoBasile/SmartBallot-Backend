const { ethers } = require('ethers');

async function testContract() {
  try {
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Indirizzo corretto del contratto
    const contractAddress = '0xd8058efe0198ae9dD7D563e1b4938Dcbc86A1F81';
    
    console.log('Testing contract at:', contractAddress);
    
    const contractABI = [
      'function admin() view returns (address)',
      'function deployer() view returns (address)',
      'function addMembersToElection(string memory electionId, uint256[] memory identityCommitments) external'
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    console.log('Getting admin...');
    const admin = await contract.admin();
    console.log('Admin:', admin);
    
    console.log('Getting deployer...');
    try {
      const deployer = await contract.deployer();
      console.log('Deployer:', deployer);
    } catch (error) {
      console.log('ERROR getting deployer:', error.reason || error.message);
      console.log('This means the contract still has the old version without deployer field!');
    }
    
  } catch (error) {
    console.error('Error:', error.reason || error.message);
  }
}

testContract();