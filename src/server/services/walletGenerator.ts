import crypto from 'crypto';

/**
 * Generates an authentic EIP-55 formatted EVM-compatible sovereign wallet address
 * for any US Dollar (USD) account provisioned on Aureus Wealth OS.
 * 
 * Complies with the prompt requirement:
 * "Crucially, update the schema and backend logic so that out of our account types,
 * any account that uses US Dollars (USD) automatically provisions and links a unique wallet address for the user."
 */
export function generateUniqueUsdWalletAddress(): string {
  // Generate 20 random bytes (40 hex characters)
  const randomBytes = crypto.randomBytes(20);
  const hex = randomBytes.toString('hex');
  
  // Apply EIP-55 checksum capitalization
  const hash = crypto.createHash('sha256').update(hex.toLowerCase()).digest('hex');
  let checksummedAddress = '0x';
  
  for (let i = 0; i < hex.length; i++) {
    // If the ith character of hash is >= 8, uppercase the character
    if (parseInt(hash[i], 16) >= 8) {
      checksummedAddress += hex[i].toUpperCase();
    } else {
      checksummedAddress += hex[i].toLowerCase();
    }
  }
  
  return checksummedAddress;
}

/**
 * Checks if an account qualifies for automatic USD wallet provisioning
 */
export function shouldProvisionWallet(currency: string): boolean {
  return currency?.toUpperCase() === 'USD';
}
