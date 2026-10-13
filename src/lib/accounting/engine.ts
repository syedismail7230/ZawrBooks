import { Account, JournalEntry, JournalLine, UserProfile } from '@/types';

/**
 * Format paise (integer) to Indian Rupee string (₹ 1,23,456.78)
 * Respects standard Indian numbering format (lakhs, crores).
 */
export function formatINR(paise: number, showSymbol: boolean = true): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;
  const paiseStr = remainderPaise.toString().padStart(2, '0');

  // Format integer rupees according to Indian numbering system
  const rupeesStr = rupees.toString();
  let lastThree = rupeesStr.substring(rupeesStr.length - 3);
  const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const sign = isNegative ? '-' : '';
  const symbol = showSymbol ? '₹ ' : '';
  return `${sign}${symbol}${formattedRupees}.${paiseStr}`;
}

/**
 * Parse a standard rupee input string into exact paise integer
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }
  return Math.round(rupees * 100);
}

/**
 * Validates that debit total equals credit total and lines are valid
 */
export function validateJournalBalance(lines: JournalLine[]): {
  isBalanced: boolean;
  totalDebitPaise: number;
  totalCreditPaise: number;
  differencePaise: number;
  errorMessage?: string;
} {
  if (!lines || lines.length < 2) {
    return {
      isBalanced: false,
      totalDebitPaise: 0,
      totalCreditPaise: 0,
      differencePaise: 0,
      errorMessage: 'A journal entry must contain at least two lines.',
    };
  }

  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  for (const line of lines) {
    if (line.debitPaise < 0 || line.creditPaise < 0) {
      return {
        isBalanced: false,
        totalDebitPaise: 0,
        totalCreditPaise: 0,
        differencePaise: 0,
        errorMessage: 'Negative amounts are not permitted in journal lines.',
      };
    }
    if (line.debitPaise > 0 && line.creditPaise > 0) {
      return {
        isBalanced: false,
        totalDebitPaise: 0,
        totalCreditPaise: 0,
        differencePaise: 0,
        errorMessage: 'A single line cannot have both a debit and a credit amount.',
      };
    }
    totalDebitPaise += line.debitPaise;
    totalCreditPaise += line.creditPaise;
  }

  const differencePaise = Math.abs(totalDebitPaise - totalCreditPaise);
  const isBalanced = totalDebitPaise > 0 && totalDebitPaise === totalCreditPaise;

  return {
    isBalanced,
    totalDebitPaise,
    totalCreditPaise,
    differencePaise,
    errorMessage: isBalanced
      ? undefined
      : `Debit and Credit must be equal and non-zero. Discrepancy: ${formatINR(differencePaise)}`,
  };
}

/**
 * Applies posted journal changes to account balances
 */
export function applyJournalToAccounts(
  entry: JournalEntry,
  accounts: Account[]
): Account[] {
  const accountMap = new Map<string, Account>();
  for (const acc of accounts) {
    accountMap.set(acc.id, { ...acc });
  }

  for (const line of entry.lines) {
    const acc = accountMap.get(line.accountId);
    if (!acc) continue;

    // Standard accounting equation:
    // Assets & Expenses: normal balance = Debit (+), Credit (-)
    // Liabilities, Equity, Revenue: normal balance = Credit (+), Debit (-)
    if (acc.type === 'Asset' || acc.type === 'Expense') {
      acc.balancePaise += line.debitPaise - line.creditPaise;
    } else {
      acc.balancePaise += line.creditPaise - line.debitPaise;
    }
  }

  return Array.from(accountMap.values());
}

/**
 * Creates an exact reversing journal entry
 */
export function createReversingJournalEntry(
  originalEntry: JournalEntry,
  reversalEntryNumber: string,
  user: UserProfile,
  reason: string
): JournalEntry {
  const reversedLines: JournalLine[] = originalEntry.lines.map((line, idx) => ({
    id: `rev-line-${Date.now()}-${idx}`,
    accountId: line.accountId,
    accountName: line.accountName,
    accountCode: line.accountCode,
    // Swap debits and credits
    debitPaise: line.creditPaise,
    creditPaise: line.debitPaise,
    description: `Reversal: ${line.description || originalEntry.description}`,
    costCentreId: line.costCentreId,
  }));

  const validation = validateJournalBalance(reversedLines);
  if (!validation.isBalanced) {
    throw new Error('Reversal lines failed balance check');
  }

  const now = new Date().toISOString();

  return {
    id: `rev-${Date.now()}`,
    organizationId: originalEntry.organizationId,
    entryNumber: reversalEntryNumber,
    entryDate: now.split('T')[0],
    postingDate: now.split('T')[0],
    status: 'Posted',
    description: `Correction / Reversal of ${originalEntry.entryNumber}: ${reason}`,
    reference: `REV-${originalEntry.entryNumber}`,
    lines: reversedLines,
    reversalOfEntryId: originalEntry.id,
    createdBy: user.id,
    createdByName: user.fullName,
    postedBy: user.id,
    postedAt: now,
    totalDebitPaise: validation.totalDebitPaise,
    totalCreditPaise: validation.totalCreditPaise,
  };
}

/**
 * Calculates Trial Balance
 */
export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  type: string;
  debitPaise: number;
  creditPaise: number;
}

export function calculateTrialBalance(accounts: Account[]): {
  rows: TrialBalanceRow[];
  totalDebitPaise: number;
  totalCreditPaise: number;
  isBalanced: boolean;
} {
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  const rows: TrialBalanceRow[] = accounts
    .filter((a) => a.balancePaise !== 0)
    .map((acc) => {
      let debit = 0;
      let credit = 0;

      if (acc.type === 'Asset' || acc.type === 'Expense') {
        if (acc.balancePaise >= 0) {
          debit = acc.balancePaise;
        } else {
          credit = Math.abs(acc.balancePaise);
        }
      } else {
        if (acc.balancePaise >= 0) {
          credit = acc.balancePaise;
        } else {
          debit = Math.abs(acc.balancePaise);
        }
      }

      totalDebitPaise += debit;
      totalCreditPaise += credit;

      return {
        accountCode: acc.code,
        accountName: acc.name,
        type: acc.type,
        debitPaise: debit,
        creditPaise: credit,
      };
    });

  return {
    rows,
    totalDebitPaise,
    totalCreditPaise,
    isBalanced: totalDebitPaise === totalCreditPaise,
  };
}

/**
 * Profit and Loss Statement
 */
export interface ProfitAndLossReport {
  operatingRevenuePaise: number;
  otherIncomePaise: number;
  totalRevenuePaise: number;
  directCostsPaise: number;
  grossProfitPaise: number;
  operatingExpensesPaise: number;
  operatingProfitPaise: number;
  taxExpensePaise: number;
  netProfitPaise: number;
  revenueAccounts: Array<{ name: string; amountPaise: number }>;
  expenseAccounts: Array<{ name: string; amountPaise: number }>;
}

export function calculateProfitAndLoss(accounts: Account[]): ProfitAndLossReport {
  const revenueAccounts = accounts
    .filter((a) => a.type === 'Revenue')
    .map((a) => ({ name: a.name, amountPaise: a.balancePaise }));

  const expenseAccounts = accounts
    .filter((a) => a.type === 'Expense')
    .map((a) => ({ name: a.name, amountPaise: a.balancePaise }));

  const operatingRevenuePaise = revenueAccounts
    .filter((a) => !a.name.toLowerCase().includes('other'))
    .reduce((sum, a) => sum + a.amountPaise, 0);

  const otherIncomePaise = revenueAccounts
    .filter((a) => a.name.toLowerCase().includes('other'))
    .reduce((sum, a) => sum + a.amountPaise, 0);

  const totalRevenuePaise = operatingRevenuePaise + otherIncomePaise;

  const directCostsPaise = expenseAccounts
    .filter(
      (a) =>
        a.name.toLowerCase().includes('cost of goods') ||
        a.name.toLowerCase().includes('direct')
    )
    .reduce((sum, a) => sum + a.amountPaise, 0);

  const grossProfitPaise = totalRevenuePaise - directCostsPaise;

  const operatingExpensesPaise = expenseAccounts
    .filter(
      (a) =>
        !a.name.toLowerCase().includes('cost of goods') &&
        !a.name.toLowerCase().includes('direct') &&
        !a.name.toLowerCase().includes('tax')
    )
    .reduce((sum, a) => sum + a.amountPaise, 0);

  const operatingProfitPaise = grossProfitPaise - operatingExpensesPaise;

  const taxExpensePaise = expenseAccounts
    .filter((a) => a.name.toLowerCase().includes('tax'))
    .reduce((sum, a) => sum + a.amountPaise, 0);

  const netProfitPaise = operatingProfitPaise - taxExpensePaise;

  return {
    operatingRevenuePaise,
    otherIncomePaise,
    totalRevenuePaise,
    directCostsPaise,
    grossProfitPaise,
    operatingExpensesPaise,
    operatingProfitPaise,
    taxExpensePaise,
    netProfitPaise,
    revenueAccounts,
    expenseAccounts,
  };
}

/**
 * Balance Sheet
 */
export interface BalanceSheetReport {
  assets: Array<{ name: string; amountPaise: number; subType: string }>;
  liabilities: Array<{ name: string; amountPaise: number; subType: string }>;
  equity: Array<{ name: string; amountPaise: number; subType: string }>;
  totalAssetsPaise: number;
  totalLiabilitiesPaise: number;
  totalEquityPaise: number;
  isBalanced: boolean;
}

export function calculateBalanceSheet(
  accounts: Account[],
  currentYearNetProfitPaise: number
): BalanceSheetReport {
  const assets = accounts
    .filter((a) => a.type === 'Asset')
    .map((a) => ({ name: a.name, amountPaise: a.balancePaise, subType: a.subType }));

  const liabilities = accounts
    .filter((a) => a.type === 'Liability')
    .map((a) => ({ name: a.name, amountPaise: a.balancePaise, subType: a.subType }));

  const baseEquity = accounts
    .filter((a) => a.type === 'Equity')
    .map((a) => ({ name: a.name, amountPaise: a.balancePaise, subType: a.subType }));

  // Include current period profit into equity
  const equity = [
    ...baseEquity,
    {
      name: 'Current Period Net Earnings',
      amountPaise: currentYearNetProfitPaise,
      subType: 'Retained Earnings',
    },
  ];

  const totalAssetsPaise = assets.reduce((s, a) => s + a.amountPaise, 0);
  const totalLiabilitiesPaise = liabilities.reduce((s, l) => s + l.amountPaise, 0);
  const totalEquityPaise = equity.reduce((s, e) => s + e.amountPaise, 0);

  const isBalanced = totalAssetsPaise === totalLiabilitiesPaise + totalEquityPaise;

  return {
    assets,
    liabilities,
    equity,
    totalAssetsPaise,
    totalLiabilitiesPaise,
    totalEquityPaise,
    isBalanced,
  };
}
