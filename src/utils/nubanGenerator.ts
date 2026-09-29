/**
 * Nigerian Uniform Bank Account Number (NUBAN) Specification & Generator
 * Fully compliant with Central Bank of Nigeria (CBN) & NIBSS standards.
 */

export interface NigerianBankInfo {
  code: string;
  name: string;
  shortName: string;
  sortCode: string;
  nipCode: string;
}

export const SUPPORTED_NIGERIAN_CLEARING_BANKS: NigerianBankInfo[] = [
  {
    code: '090',
    name: 'Aureus Wealth Bank (Nigeria) Ltd',
    shortName: 'Aureus Bank',
    sortCode: '090110',
    nipCode: '090581'
  },
  {
    code: '058',
    name: 'Guaranty Trust Bank (GTBank)',
    shortName: 'GTBank',
    sortCode: '058152',
    nipCode: '000013'
  },
  {
    code: '044',
    name: 'Access Bank Plc',
    shortName: 'Access Bank',
    sortCode: '044150',
    nipCode: '000014'
  },
  {
    code: '011',
    name: 'First Bank of Nigeria',
    shortName: 'FirstBank',
    sortCode: '011151',
    nipCode: '000016'
  },
  {
    code: '033',
    name: 'United Bank for Africa (UBA)',
    shortName: 'UBA',
    sortCode: '033153',
    nipCode: '000004'
  },
  {
    code: '035',
    name: 'Wema Bank / ALAT',
    shortName: 'Wema/ALAT',
    sortCode: '035150',
    nipCode: '000017'
  }
];

/**
 * Calculates CBN NUBAN Check Digit using the official modulo 10 algorithm.
 * Bank Code (3 digits) + Account Serial (9 digits)
 * Multiplier weights: [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3]
 */
export function calculateNubanCheckDigit(bankCode: string, serialNumber9Digits: string): number {
  const combined = bankCode.padStart(3, '0') + serialNumber9Digits.padStart(9, '0');
  const weights = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];
  
  let total = 0;
  for (let i = 0; i < 12; i++) {
    total += parseInt(combined[i], 10) * weights[i];
  }
  
  const remainder = total % 10;
  return (10 - remainder) % 10;
}

/**
 * Validates whether a 10-digit NUBAN matches the CBN checksum for a given bank code.
 */
export function validateNuban(accountNumber10Digits: string, bankCode: string = '090'): boolean {
  if (accountNumber10Digits.length !== 10 || !/^\d+$/.test(accountNumber10Digits)) {
    return false;
  }
  const serial9 = accountNumber10Digits.substring(0, 9);
  const checkDigitProvided = parseInt(accountNumber10Digits[9], 10);
  const calculatedCheckDigit = calculateNubanCheckDigit(bankCode, serial9);
  return checkDigitProvided === calculatedCheckDigit;
}

/**
 * Generates an authentic 10-digit Nigerian NUBAN account number.
 * Can specify bank code (defaults to '090' for Aureus Wealth Bank).
 */
export function generateNigerianNuban(bankCode: string = '090'): {
  nuban: string;
  formatted: string;
  serialNumber: string;
  checkDigit: number;
} {
  // Common Nigerian branch prefixes: 01, 02, 10, 20, 30, 50, 70, 80
  const branchPrefixes = ['01', '02', '10', '21', '30', '50', '80'];
  const prefix = branchPrefixes[Math.floor(Math.random() * branchPrefixes.length)];
  
  // 7 random numeric digits to form 9 serial digits total
  let serialRemainder = '';
  for (let i = 0; i < 7; i++) {
    serialRemainder += Math.floor(Math.random() * 10).toString();
  }
  
  const serial9 = `${prefix}${serialRemainder}`;
  const checkDigit = calculateNubanCheckDigit(bankCode, serial9);
  const nuban = `${serial9}${checkDigit}`;
  
  return {
    nuban,
    formatted: `${nuban.slice(0, 4)} ${nuban.slice(4, 7)} ${nuban.slice(7)}`,
    serialNumber: serial9,
    checkDigit
  };
}
