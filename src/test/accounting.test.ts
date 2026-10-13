import { describe, it, expect } from 'vitest';
import {
  formatINR,
  rupeesToPaise,
  validateJournalBalance,
  applyJournalToAccounts,
  createReversingJournalEntry,
  calculateTrialBalance,
  calculateProfitAndLoss,
  calculateBalanceSheet,
} from '@/lib/accounting/engine';
import { evaluateExpenseApproval } from '@/lib/rbac/permissions';
import { verifyAuditChainIntegrity, computeSyncHash } from '@/lib/audit/trail';
import { Account, ApprovalPolicy, AuditEvent, ExpenseSubmission, JournalEntry, JournalLine, UserProfile } from '@/types';

describe('Zawr Books Accounting Engine Invariants', () => {
  it('correctly converts between rupees and minor-unit paise', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise('1,234.50')).toBe(123450);
    expect(formatINR(123450)).toBe('₹ 1,234.50');
    expect(formatINR(10000000)).toBe('₹ 1,00,000.00'); // 1 Lakh
    expect(formatINR(1000000000)).toBe('₹ 1,00,00,000.00'); // 1 Crore
  });

  it('AC-05: Rejects unbalanced journal entries and enforces debit equals credit', () => {
    const unbalancedLines: JournalLine[] = [
      {
        id: '1',
        accountId: 'acc-1',
        debitPaise: 50000,
        creditPaise: 0,
        description: 'Office Supplies',
      },
      {
        id: '2',
        accountId: 'acc-2',
        debitPaise: 0,
        creditPaise: 40000, // Discrepancy of 10000 paise
        description: 'Cash',
      },
    ];

    const result = validateJournalBalance(unbalancedLines);
    expect(result.isBalanced).toBe(false);
    expect(result.differencePaise).toBe(10000);
    expect(result.errorMessage).toBeDefined();

    const balancedLines: JournalLine[] = [
      {
        id: '1',
        accountId: 'acc-1',
        debitPaise: 50000,
        creditPaise: 0,
        description: 'Office Supplies',
      },
      {
        id: '2',
        accountId: 'acc-2',
        debitPaise: 0,
        creditPaise: 50000,
        description: 'Cash',
      },
    ];

    const balancedResult = validateJournalBalance(balancedLines);
    expect(balancedResult.isBalanced).toBe(true);
    expect(balancedResult.differencePaise).toBe(0);
  });

  it('AC-06: Generates valid reversing journal entry that balances and links to original', () => {
    const originalEntry: JournalEntry = {
      id: 'je-test-1',
      organizationId: 'org-1',
      entryNumber: 'JE-100',
      entryDate: '2026-04-10',
      status: 'Posted',
      description: 'Accrual entry for utility',
      lines: [
        { id: 'l1', accountId: 'acc-exp', debitPaise: 150000, creditPaise: 0, description: 'Electricity' },
        { id: 'l2', accountId: 'acc-liab', debitPaise: 0, creditPaise: 150000, description: 'Payable' },
      ],
      createdBy: 'u1',
      totalDebitPaise: 150000,
      totalCreditPaise: 150000,
    };

    const user: UserProfile = {
      id: 'u-finance',
      email: 'finance@test.com',
      fullName: 'Finance Lead',
      role: 'finance_admin',
    };

    const reversal = createReversingJournalEntry(
      originalEntry,
      'REV-JE-100',
      user,
      'Duplicate entry adjustment'
    );

    expect(reversal.reversalOfEntryId).toBe('je-test-1');
    expect(reversal.status).toBe('Posted');
    expect(reversal.lines[0].debitPaise).toBe(0);
    expect(reversal.lines[0].creditPaise).toBe(150000);
    expect(reversal.lines[1].debitPaise).toBe(150000);
    expect(reversal.lines[1].creditPaise).toBe(0);
    expect(reversal.totalDebitPaise).toBe(150000);
    expect(reversal.totalCreditPaise).toBe(150000);
  });

  it('AC-10: Reconciles Profit and Loss Statement with ledger balances', () => {
    const testAccounts: Account[] = [
      { id: '1', organizationId: 'o1', code: '4010', name: 'Software Services Revenue', type: 'Revenue', subType: 'Sales', balancePaise: 10000000, isActive: true, currency: 'INR' }, // ₹1,00,000
      { id: '2', organizationId: 'o1', code: '5010', name: 'Direct Cloud Hosting', type: 'Expense', subType: 'Direct Costs', balancePaise: 2000000, isActive: true, currency: 'INR' }, // ₹20,000
      { id: '3', organizationId: 'o1', code: '5020', name: 'Office Internet', type: 'Expense', subType: 'Overheads', balancePaise: 1000000, isActive: true, currency: 'INR' }, // ₹10,000
    ];

    const pnl = calculateProfitAndLoss(testAccounts);
    expect(pnl.totalRevenuePaise).toBe(10000000);
    expect(pnl.directCostsPaise).toBe(2000000);
    expect(pnl.grossProfitPaise).toBe(8000000);
    expect(pnl.operatingExpensesPaise).toBe(1000000);
    expect(pnl.netProfitPaise).toBe(7000000); // ₹70,000 net profit
  });

  it('AC-11: Bank to Bank transfer leaves revenue and expenses unchanged', () => {
    const hdfc: Account = { id: 'hdfc', organizationId: 'o1', code: '1020', name: 'HDFC Bank', type: 'Asset', subType: 'Cash', balancePaise: 5000000, isActive: true, currency: 'INR' };
    const icici: Account = { id: 'icici', organizationId: 'o1', code: '1030', name: 'ICICI Bank', type: 'Asset', subType: 'Cash', balancePaise: 2000000, isActive: true, currency: 'INR' };
    const revenueAcc: Account = { id: 'rev', organizationId: 'o1', code: '4010', name: 'Sales Revenue', type: 'Revenue', subType: 'Revenue', balancePaise: 8000000, isActive: true, currency: 'INR' };

    const initialAccounts = [hdfc, icici, revenueAcc];

    // Transfer ₹10,000 (1000000 paise) from HDFC to ICICI
    const transferEntry: JournalEntry = {
      id: 'je-trf',
      organizationId: 'o1',
      entryNumber: 'JE-TRF-1',
      entryDate: '2026-04-10',
      status: 'Posted',
      description: 'Transfer HDFC to ICICI',
      lines: [
        { id: 'l1', accountId: 'icici', debitPaise: 1000000, creditPaise: 0, description: 'Debit ICICI' },
        { id: 'l2', accountId: 'hdfc', debitPaise: 0, creditPaise: 1000000, description: 'Credit HDFC' },
      ],
      createdBy: 'u1',
      totalDebitPaise: 1000000,
      totalCreditPaise: 1000000,
    };

    const updated = applyJournalToAccounts(transferEntry, initialAccounts);
    const updatedHdfc = updated.find((a) => a.id === 'hdfc')!;
    const updatedIcici = updated.find((a) => a.id === 'icici')!;
    const updatedRev = updated.find((a) => a.id === 'rev')!;

    expect(updatedHdfc.balancePaise).toBe(4000000); // 50000 - 10000
    expect(updatedIcici.balancePaise).toBe(3000000); // 20000 + 10000
    expect(updatedRev.balancePaise).toBe(8000000); // Revenue completely unchanged!
  });
});

describe('Zawr Books RBAC & Approval Controls', () => {
  it('AC-04: Prevents self-approval of employee expense submissions', () => {
    const employeeUser: UserProfile = {
      id: 'user-arjun',
      email: 'arjun@zawr.com',
      fullName: 'Arjun Nair',
      role: 'approver', // Even if user holds an approver role
      department: 'Engineering',
    };

    const ownExpense: ExpenseSubmission = {
      id: 'exp-own',
      organizationId: 'org-1',
      employeeId: 'user-arjun', // Submitted by Arjun
      employeeName: 'Arjun Nair',
      title: 'Lunch with prospect',
      vendorName: 'Mainland China',
      invoiceNumber: 'INV-123',
      invoiceDate: '2026-04-10',
      category: 'Meals & Entertainment',
      department: 'Engineering',
      subtotalPaise: 250000,
      cgstPaise: 6250,
      sgstPaise: 6250,
      igstPaise: 0,
      cessPaise: 0,
      totalTaxPaise: 12500,
      grandTotalPaise: 262500,
      isTaxIncluded: true,
      businessPurpose: 'Prospect meeting',
      paymentMethod: 'Credit Card',
      isReimbursable: true,
      status: 'Submitted',
      createdAt: '2026-04-10T12:00:00.000Z',
    };

    const policies: ApprovalPolicy[] = [
      {
        id: 'pol-1',
        organizationId: 'org-1',
        name: 'Operational Expenses',
        minAmountPaise: 0,
        maxAmountPaise: 10000000,
        approverRole: 'approver',
        prohibitSelfApproval: true,
        isActive: true,
      },
    ];

    const result = evaluateExpenseApproval(employeeUser, ownExpense, policies);
    expect(result.canApprove).toBe(false);
    expect(result.reason).toContain('Separation of Duties violation');

    // A distinct manager can approve
    const managerUser: UserProfile = {
      id: 'user-vikram',
      email: 'vikram@zawr.com',
      fullName: 'Vikram Singh',
      role: 'approver',
      department: 'Engineering',
    };

    const managerResult = evaluateExpenseApproval(managerUser, ownExpense, policies);
    expect(managerResult.canApprove).toBe(true);
  });
});

describe('Zawr Books Audit Chain Tamper-evidence', () => {
  it('AC-07: Validates intact hash chains and detects tampered audit records', () => {
    const genesis = 'sha256-genesis';
    const h1 = computeSyncHash(genesis, '2026-04-01', 'u1', 'ACTION_1', 'Org', '1', {});
    const h2 = computeSyncHash(h1, '2026-04-02', 'u2', 'ACTION_2', 'Org', '1', {});

    const validChain: AuditEvent[] = [
      {
        id: 'e1',
        organizationId: 'o1',
        actorId: 'u1',
        actorName: 'User 1',
        action: 'ACTION_1',
        entityType: 'Org',
        entityId: '1',
        hash: h1,
        prevHash: genesis,
        timestamp: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'e2',
        organizationId: 'o1',
        actorId: 'u2',
        actorName: 'User 2',
        action: 'ACTION_2',
        entityType: 'Org',
        entityId: '1',
        hash: h2,
        prevHash: h1,
        timestamp: '2026-04-02T00:00:00.000Z',
      },
    ];

    const checkValid = verifyAuditChainIntegrity(validChain);
    expect(checkValid.isValid).toBe(true);

    // Tampered chain: e2's prevHash doesn't match e1's hash
    const tamperedChain: AuditEvent[] = [
      validChain[0],
      {
        ...validChain[1],
        prevHash: 'tampered-previous-hash',
      },
    ];

    const checkTampered = verifyAuditChainIntegrity(tamperedChain);
    expect(checkTampered.isValid).toBe(false);
    expect(checkTampered.tamperedEventId).toBe('e2');
    expect(checkTampered.reason).toContain('Hash chain break detected');
  });
});
