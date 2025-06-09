import { ethers } from 'ethers';

// Configuration
const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/'; // Public BSC RPC endpoint
const USDT_CONTRACT_ADDRESS_BSC = '0x55d398326f99059fF775485246999027B3197955'; // USDT on BSC
const ADDRESS_TO_CHECK = '0xE40271aBfeb6A3fD78F9e6C8736A7834B71A8426'; // Replace with the address you want to check

// Minimal ABI for ERC20 balanceOf and decimals
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function getUsdtBalance(address: string): Promise<void> {
 

  try {
    // 1. Connect to BSC RPC
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
    console.log('Connected to BSC RPC.');

    // 2. Create USDT contract instance
    const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS_BSC, ERC20_ABI, provider);
    console.log(`USDT contract instance created for address: ${USDT_CONTRACT_ADDRESS_BSC}`);

    // 3. Get balance and decimals
    const balanceBigInt = await usdtContract.balanceOf(address);
    console.log(`Raw balance for ${address}: ${balanceBigInt.toString()}`);

    const decimals = await usdtContract.decimals();
    console.log(`USDT decimals: ${decimals}`);

    // 4. Format the balance
    const formattedBalance = ethers.formatUnits(balanceBigInt, decimals);
    console.log(`Formatted USDT balance for ${address}: ${formattedBalance}`);

  } catch (error) {
    console.error('Error fetching USDT balance:', error);
  }
}

// Run the function
getUsdtBalance(ADDRESS_TO_CHECK).then(() => {
  console.log('Script finished.');
}).catch(error => {
  console.error('Unhandled error in script:', error);
});
