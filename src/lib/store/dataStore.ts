import {
  Account,
  ApprovalPolicy,
  AuditEvent,
  BankAccount,
  BankStatementLine,
  Customer,
  ExpenseSubmission,
  Invoice,
  JournalEntry,
  Organization,
  ReportExecutionLog,
  ReportSchedule,
  UserProfile,
  Vendor,
  VendorBill,
} from '@/types';
import {
  applyJournalToAccounts,
  createReversingJournalEntry,
  validateJournalBalance,
} from '@/lib/accounting/engine';
import { computeSyncHash } from '@/lib/audit/trail';
import { evaluateExpenseApproval } from '@/lib/rbac/permissions';
import { defaultOrganization, defaultStandardAccounts } from './defaultData';

export interface DataStoreState {
  isAuthenticated: boolean;
  organization: Organization | null;
  users: UserProfile[];
  currentUser: UserProfile;
  accounts: Account[];
  journalEntries: JournalEntry[];
  expenses: ExpenseSubmission[];
  customers: Customer[];
  invoices: Invoice[];
  vendors: Vendor[];
  vendorBills: VendorBill[];
  bankAccounts: BankAccount[];
  bankStatementLines: BankStatementLine[];
  approvalPolicies: ApprovalPolicy[];
  auditEvents: AuditEvent[];
  reportSchedules: ReportSchedule[];
  reportExecutionLogs: ReportExecutionLog[];
  documents: Array<{
    id: string;
    name: string;
    category: string;
    size: string;
    hash: string;
    uploadedBy: string;
    date: string;
    status: string;
  }>;
  budgets: Array<{
    id: string;
    name: string;
    costCentre: string;
    budgetPaise: number;
    actualPaise: number;
  }>;
}

// Initial recognized organization users (Strictly 3 authorized accounts)
export const defaultRecognizedUsers: UserProfile[] = [
  {
    id: 'usr-ceo',
    email: 'ceo@zawrindustries.com',
    fullName: 'Syed Ismail Zabiulla',
    role: 'owner', // Full Super Admin Rights
    department: 'Director',
  },
  {
    id: 'usr-md',
    email: 'md@zawrindustries.com',
    fullName: 'Mohammed Ahmed',
    role: 'director',
    department: 'Director',
  },
  {
    id: 'usr-finance',
    email: 'accounts@zawrindustries.com',
    fullName: 'Zawr Finance Accounts',
    role: 'finance_admin',
    department: 'Corporate Finance',
  },
];

const defaultRealAdmin: UserProfile = defaultRecognizedUsers[0];

const STORAGE_KEY = 'zawr_books_live_store_v1';

class DataStore {
  private state: DataStoreState;
  private listeners: Set<() => void> = new Set();
  private isLoadedFromStorage = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastSyncTimestamp: number = Date.now();

  constructor() {
    this.state = {
      isAuthenticated: false,
      organization: defaultOrganization,
      users: [...defaultRecognizedUsers],
      currentUser: defaultRealAdmin,
      accounts: [...defaultStandardAccounts],
      journalEntries: [],
      expenses: [],
      customers: [],
      invoices: [],
      vendors: [],
      vendorBills: [],
      bankAccounts: [],
      bankStatementLines: [],
      approvalPolicies: [],
      auditEvents: [],
      reportSchedules: [],
      reportExecutionLogs: [],
      documents: [],
      budgets: [],
    };

    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
      this.initRealtimeSync();
    }
  }

  private initRealtimeSync() {
    if (typeof window === 'undefined') return;

    // 1. Cross-tab real-time communication via BroadcastChannel
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('zawr_realtime_data_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'REALTIME_STORE_SYNC') {
            this.lastSyncTimestamp = event.data.timestamp || Date.now();
            this.loadFromLocalStorage();
            this.notify();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or blocked:', e);
      }
    }

    // 2. Storage event fallback for older browsers or if channel drops
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.lastSyncTimestamp = Date.now();
        this.loadFromLocalStorage();
        this.notify();
      }
    });
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Strictly filter to the 3 authorized accounts
        const allowedEmails = new Set(defaultRecognizedUsers.map((u) => u.email.toLowerCase()));
        const existingUsers: UserProfile[] = (parsed.users || []).filter((u: UserProfile) =>
          allowedEmails.has(u.email.toLowerCase())
        );

        const mergedUsers = defaultRecognizedUsers.map((def) => {
          const match = existingUsers.find((eu) => eu.email.toLowerCase() === def.email.toLowerCase());
          return match
            ? { ...def, passwordHash: match.passwordHash || def.passwordHash, lastLoginAt: match.lastLoginAt || def.lastLoginAt }
            : { ...def };
        });

        // Determine active currentUser
        let activeUser = parsed.currentUser;
        if (!activeUser || !allowedEmails.has(activeUser.email?.toLowerCase())) {
          activeUser = defaultRecognizedUsers[0];
        } else {
          const matching = defaultRecognizedUsers.find((u) => u.email.toLowerCase() === activeUser.email.toLowerCase());
          if (matching) {
            activeUser = { ...activeUser, fullName: matching.fullName, role: matching.role, department: matching.department };
          }
        }

        this.state = {
          ...this.state,
          ...parsed,
          organization: parsed.organization || defaultOrganization,
          accounts: (parsed.accounts && parsed.accounts.length > 0) ? parsed.accounts : [...defaultStandardAccounts],
          users: mergedUsers,
          currentUser: activeUser,
          isAuthenticated: typeof parsed.isAuthenticated === 'boolean' ? parsed.isAuthenticated : false,
        };
        this.isLoadedFromStorage = true;
        this.syncWithServer();
      } else {
        this.syncWithServer();
      }
    } catch (e) {
      console.warn('Could not load local state:', e);
    }
  }

  private persist() {
    this.lastSyncTimestamp = Date.now();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.broadcastChannel?.postMessage({
          type: 'REALTIME_STORE_SYNC',
          timestamp: this.lastSyncTimestamp,
        });
      } catch (e) {
        console.warn('Could not persist state:', e);
      }
    }
    this.notify();
  }

  public getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  public async syncWithServer() {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/store/sync');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          const s = data.state;
          let changed = false;

          // Reconcile expenses (union by ID)
          const expenseMap = new Map<string, ExpenseSubmission>();
          for (const e of s.expenses || []) {
            if (e?.id) expenseMap.set(e.id, e);
          }
          for (const e of this.state.expenses || []) {
            if (e?.id && !expenseMap.has(e.id)) {
              expenseMap.set(e.id, e);
            }
          }
          const mergedExpenses = Array.from(expenseMap.values());
          if (mergedExpenses.length !== this.state.expenses.length) {
            this.state.expenses = mergedExpenses;
            changed = true;
          }

          // Reconcile vendorBills (union by ID)
          const billMap = new Map<string, VendorBill>();
          for (const b of s.vendorBills || []) {
            if (b?.id) billMap.set(b.id, b);
          }
          for (const b of this.state.vendorBills || []) {
            if (b?.id && !billMap.has(b.id)) {
              billMap.set(b.id, b);
            }
          }
          const mergedBills = Array.from(billMap.values());
          if (mergedBills.length !== this.state.vendorBills.length) {
            this.state.vendorBills = mergedBills;
            changed = true;
          }

          if (s.organization && (!this.state.organization || s.organization.name !== this.state.organization.name)) {
            this.state.organization = s.organization;
            changed = true;
          }

          if (changed) {
            this.persistLocally();
            this.notify();
          }
        }
      }
    } catch {
      // offline / quiet fallback
    }
  }

  private persistLocally() {
    this.lastSyncTimestamp = Date.now();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.broadcastChannel?.postMessage({
          type: 'REALTIME_STORE_SYNC',
          timestamp: this.lastSyncTimestamp,
        });
      } catch (e) {
        console.warn('Could not persist state locally:', e);
      }
    }
  }

  public syncNow() {
    this.loadFromLocalStorage();
    this.lastSyncTimestamp = Date.now();
    this.notify();
  }

  public getState(): DataStoreState {
    if (typeof window !== 'undefined' && !this.isLoadedFromStorage) {
      this.loadFromLocalStorage();
    }
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // Initialize or update real organization
  public setOrganization(orgData: {
    name: string;
    legalName: string;
    gstin: string;
    pan: string;
    currency?: string;
    fyStartMonth?: number;
    timezone?: string;
    periodLockedUntil?: string;
  }) {
    const orgId = this.state.organization?.id || `org-${Date.now()}`;
    const organization: Organization = {
      id: orgId,
      name: orgData.name,
      legalName: orgData.legalName,
      gstin: orgData.gstin,
      pan: orgData.pan,
      currency: orgData.currency || 'INR',
      fyStartMonth: orgData.fyStartMonth || 4,
      timezone: orgData.timezone || 'Asia/Kolkata',
      periodLockedUntil: orgData.periodLockedUntil || undefined,
      createdAt: this.state.organization?.createdAt || new Date().toISOString(),
    };

    this.state.organization = organization;

    this.recordAuditEvent(
      'SET_ORGANIZATION',
      'Organization',
      organization.id,
      null,
      { name: organization.name, gstin: organization.gstin }
    );

    this.persist();

    if (typeof window !== 'undefined') {
      fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organization),
      }).catch(() => {});
    }

    return organization;
  }

  // Authenticate & Log In
  public login(user: UserProfile) {
    this.state.isAuthenticated = true;
    this.state.currentUser = user;
    user.lastLoginAt = new Date().toISOString();
    const idx = this.state.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      this.state.users[idx] = { ...user };
    }
    this.recordAuditEvent('USER_LOGIN', 'UserProfile', user.id, null, {
      email: user.email,
      role: user.role,
      loginAt: user.lastLoginAt,
    });
    this.persist();
  }

  // Log Out Active User
  public logout() {
    const user = this.state.currentUser;
    this.recordAuditEvent('USER_LOGOUT', 'UserProfile', user.id, null, {
      email: user.email,
    });
    this.state.isAuthenticated = false;
    this.persist();
  }

  // Find user by email (case-insensitive)
  public findUserByEmail(email: string): UserProfile | undefined {
    const normalized = email.trim().toLowerCase();
    return this.state.users.find((u) => u.email.trim().toLowerCase() === normalized);
  }

  // Find or automatically provision recognized user
  public findOrCreateUser(email: string, role?: import('@/types').UserRole, fullName?: string): UserProfile {
    const existing = this.findUserByEmail(email);
    if (existing) {
      return existing;
    }
    const namePart = email.split('@')[0];
    const derivedName = fullName || namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    
    // Assign appropriate initial role
    let derivedRole: import('@/types').UserRole = role || 'accountant';
    if (email.includes('admin') || email.includes('ceo') || email.includes('ismail')) {
      derivedRole = 'owner';
    } else if (email.includes('director') || email.includes('md')) {
      derivedRole = 'director';
    } else if (email.includes('finance') || email.includes('accounts')) {
      derivedRole = 'finance_admin';
    } else if (email.includes('employee') || email.includes('staff')) {
      derivedRole = 'employee';
    } else if (email.includes('audit')) {
      derivedRole = 'auditor';
    }

    return this.addUser({
      email: email.trim().toLowerCase(),
      fullName: derivedName,
      role: derivedRole,
      department: derivedRole === 'owner' || derivedRole === 'director' ? 'Executive Management' : 'Finance & Operations',
    });
  }

  // Set / Update User Password
  public setUserPassword(userIdOrEmail: string, passwordHash: string): boolean {
    const user = this.state.users.find(
      (u) => u.id === userIdOrEmail || u.email.trim().toLowerCase() === userIdOrEmail.trim().toLowerCase()
    );
    if (!user) return false;
    user.passwordHash = passwordHash;
    if (this.state.currentUser.id === user.id) {
      this.state.currentUser.passwordHash = passwordHash;
    }
    this.recordAuditEvent('SET_PASSWORD', 'UserProfile', user.id, null, {
      email: user.email,
      timestamp: new Date().toISOString(),
    });
    this.persist();
    return true;
  }

  // Switch Active User / RBAC Role
  public switchUser(userId: string) {
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      this.state.currentUser = user;
      this.persist();
    }
  }

  // Add real organization user
  public addUser(userData: Omit<UserProfile, 'id'>) {
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      ...userData,
    };
    this.state.users.push(newUser);
    this.recordAuditEvent('CREATE_USER', 'UserProfile', newUser.id, null, {
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
    });
    this.persist();
    return newUser;
  }

  // Create real Chart of Accounts item
  public addAccount(accountData: Omit<Account, 'id' | 'organizationId' | 'balancePaise'>) {
    const orgId = this.state.organization?.id || 'org-default';
    const newAcc: Account = {
      id: `acc-${accountData.code}`,
      organizationId: orgId,
      balancePaise: 0,
      ...accountData,
    };
    this.state.accounts.push(newAcc);
    this.recordAuditEvent('CREATE_ACCOUNT', 'Account', newAcc.id, null, {
      code: newAcc.code,
      name: newAcc.name,
      type: newAcc.type,
    });
    this.persist();
    return newAcc;
  }

  // Post Journal Entry (Double-entry engine)
  public postJournal(entry: JournalEntry): { success: boolean; error?: string } {
    const validation = validateJournalBalance(entry.lines);
    if (!validation.isBalanced) {
      return { success: false, error: validation.errorMessage };
    }

    if (this.state.organization?.periodLockedUntil) {
      if (entry.entryDate <= this.state.organization.periodLockedUntil) {
        return {
          success: false,
          error: `Fiscal period is locked through ${this.state.organization.periodLockedUntil}. Postings into closed periods are restricted.`,
        };
      }
    }

    const postedEntry: JournalEntry = {
      ...entry,
      status: 'Posted',
      postedBy: this.state.currentUser.id,
      postedAt: new Date().toISOString(),
      postingDate: new Date().toISOString().split('T')[0],
      totalDebitPaise: validation.totalDebitPaise,
      totalCreditPaise: validation.totalCreditPaise,
    };

    this.state.accounts = applyJournalToAccounts(postedEntry, this.state.accounts);
    this.state.journalEntries.push(postedEntry);

    this.recordAuditEvent(
      'POST_JOURNAL_ENTRY',
      'JournalEntry',
      postedEntry.id,
      { status: entry.status },
      { status: 'Posted', totalPaise: validation.totalDebitPaise }
    );

    this.persist();
    return { success: true };
  }

  // Reverse Posted Journal Entry
  public reverseJournal(
    originalEntryId: string,
    reason: string
  ): { success: boolean; reversalEntry?: JournalEntry; error?: string } {
    const original = this.state.journalEntries.find((j) => j.id === originalEntryId);
    if (!original) {
      return { success: false, error: 'Journal entry not found' };
    }
    if (original.status !== 'Posted') {
      return { success: false, error: 'Only posted journal entries can be reversed' };
    }

    const reversalNumber = `REV-${original.entryNumber}`;
    const reversal = createReversingJournalEntry(
      original,
      reversalNumber,
      this.state.currentUser,
      reason
    );

    this.state.accounts = applyJournalToAccounts(reversal, this.state.accounts);
    original.status = 'Reversed';
    this.state.journalEntries.push(reversal);

    this.recordAuditEvent(
      'REVERSE_JOURNAL_ENTRY',
      'JournalEntry',
      original.id,
      { status: 'Posted' },
      { status: 'Reversed', reversalEntryId: reversal.id },
      reason
    );

    this.persist();
    return { success: true, reversalEntry: reversal };
  }

  // Submit Expense
  public submitExpense(
    expenseData: Omit<ExpenseSubmission, 'id' | 'organizationId' | 'status' | 'createdAt'>
  ): ExpenseSubmission {
    const id = `exp-${Date.now()}`;
    const orgId = this.state.organization?.id || 'org-default';
    const newExpense: ExpenseSubmission = {
      ...expenseData,
      id,
      organizationId: orgId,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
    };

    this.state.expenses.unshift(newExpense);

    this.recordAuditEvent(
      'SUBMIT_EXPENSE',
      'ExpenseSubmission',
      id,
      null,
      { title: newExpense.title, amount: newExpense.grandTotalPaise }
    );

    this.persist();

    if (typeof window !== 'undefined') {
      fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_EXPENSE',
          payload: newExpense,
        }),
      }).catch(() => {});
    }

    return newExpense;
  }

  // Review & Approve / Reject Expense
  public reviewExpense(
    expenseId: string,
    decision: 'Approved' | 'Rejected' | 'Returned',
    comment?: string
  ): { success: boolean; error?: string } {
    const exp = this.state.expenses.find((e) => e.id === expenseId);
    if (!exp) return { success: false, error: 'Expense not found' };

    const evalResult = evaluateExpenseApproval(
      this.state.currentUser,
      exp,
      this.state.approvalPolicies
    );
    if (!evalResult.canApprove) {
      return { success: false, error: evalResult.reason };
    }

    const prevStatus = exp.status;
    exp.status = decision;
    exp.approverId = this.state.currentUser.id;
    exp.approverName = this.state.currentUser.fullName;
    exp.approvedAt = new Date().toISOString();

    if (comment) {
      exp.comments = exp.comments || [];
      exp.comments.push({
        author: this.state.currentUser.fullName,
        text: comment,
        createdAt: new Date().toISOString(),
      });
    }

    this.recordAuditEvent(
      `DECIDE_EXPENSE_${decision.toUpperCase()}`,
      'ExpenseSubmission',
      exp.id,
      { status: prevStatus },
      { status: decision, approver: this.state.currentUser.fullName },
      comment
    );

    this.persist();

    if (typeof window !== 'undefined') {
      fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVIEW_EXPENSE',
          payload: { id: expenseId, decision, approver: this.state.currentUser, comment },
        }),
      }).catch(() => {});
    }

    return { success: true };
  }

  // Update Expense (e.g. employee resubmitting after return, or fixing fields)
  public updateExpense(
    expenseId: string,
    updates: Partial<ExpenseSubmission>
  ): { success: boolean; error?: string; expense?: ExpenseSubmission } {
    const exp = this.state.expenses.find((e) => e.id === expenseId);
    if (!exp) return { success: false, error: 'Expense not found' };

    const prevStatus = exp.status;
    Object.assign(exp, updates);

    // If it was returned and is now resubmitted by employee without specifying status, move to Submitted
    if (prevStatus === 'Returned' && !updates.status) {
      exp.status = 'Submitted';
    }

    this.recordAuditEvent(
      'UPDATE_EXPENSE',
      'ExpenseSubmission',
      exp.id,
      { status: prevStatus },
      { status: exp.status, amount: exp.grandTotalPaise }
    );

    this.persist();
    return { success: true, expense: exp };
  }

  // Delete Expense (only if in draft, returned, or unreviewed state)
  public deleteExpense(expenseId: string): { success: boolean; error?: string } {
    const index = this.state.expenses.findIndex((e) => e.id === expenseId);
    if (index === -1) return { success: false, error: 'Expense not found' };

    const exp = this.state.expenses[index];
    if (exp.status === 'Approved' || exp.status === 'Posted') {
      return { success: false, error: 'Cannot delete approved or posted expenses' };
    }

    const [removed] = this.state.expenses.splice(index, 1);
    this.recordAuditEvent(
      'DELETE_EXPENSE',
      'ExpenseSubmission',
      expenseId,
      { title: removed.title, amount: removed.grandTotalPaise },
      null
    );

    this.persist();
    return { success: true };
  }

  // Update User Profile (e.g., bank payout preferences, phone)
  public updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): { success: boolean; error?: string } {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    Object.assign(user, updates);
    if (this.state.currentUser.id === userId) {
      this.state.currentUser = { ...this.state.currentUser, ...updates };
    }

    this.persist();
    return { success: true };
  }

  // Add Customer
  public addCustomer(custData: Omit<Customer, 'id' | 'organizationId' | 'outstandingBalancePaise'>) {
    const orgId = this.state.organization?.id || 'org-default';
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      organizationId: orgId,
      outstandingBalancePaise: 0,
      ...custData,
    };
    this.state.customers.push(newCust);
    this.recordAuditEvent('CREATE_CUSTOMER', 'Customer', newCust.id, null, {
      name: newCust.name,
      gstin: newCust.gstin,
    });
    this.persist();
    return newCust;
  }

  // Add Vendor
  public addVendor(vendData: Omit<Vendor, 'id' | 'organizationId' | 'outstandingBalancePaise'>) {
    const orgId = this.state.organization?.id || 'org-default';
    const newVend: Vendor = {
      id: `vend-${Date.now()}`,
      organizationId: orgId,
      outstandingBalancePaise: 0,
      ...vendData,
    };
    this.state.vendors.push(newVend);
    this.recordAuditEvent('CREATE_VENDOR', 'Vendor', newVend.id, null, {
      name: newVend.name,
      gstin: newVend.gstin,
    });
    this.persist();
    return newVend;
  }

  // Add Bank Account
  public addBankAccount(accData: Omit<BankAccount, 'id' | 'organizationId' | 'currentBalancePaise'>) {
    const orgId = this.state.organization?.id || 'org-default';
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      organizationId: orgId,
      currentBalancePaise: 0,
      ...accData,
    };
    this.state.bankAccounts.push(newBank);
    this.recordAuditEvent('CREATE_BANK_ACCOUNT', 'BankAccount', newBank.id, null, {
      accountName: newBank.accountName,
      bankName: newBank.bankName,
    });
    this.persist();
    return newBank;
  }

  // Create & Issue Customer Invoice
  public createInvoice(
    invoiceData: Omit<Invoice, 'id' | 'organizationId' | 'status' | 'amountPaidPaise' | 'createdAt'>
  ): Invoice {
    const id = `inv-${Date.now()}`;
    const orgId = this.state.organization?.id || 'org-default';
    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      organizationId: orgId,
      status: 'Issued',
      amountPaidPaise: 0,
      createdAt: new Date().toISOString(),
    };

    this.state.invoices.unshift(newInvoice);

    const cust = this.state.customers.find((c) => c.id === newInvoice.customerId);
    if (cust) {
      cust.outstandingBalancePaise += newInvoice.totalPaise;
    }

    // Auto-create balanced journal entry
    const receivableAcc = this.state.accounts.find((a) => a.code === '1100');
    const revenueAcc = this.state.accounts.find((a) => a.type === 'Revenue');

    if (receivableAcc && revenueAcc) {
      const jeId = `je-inv-${Date.now()}`;
      const journal: JournalEntry = {
        id: jeId,
        organizationId: orgId,
        entryNumber: `JE-INV-${newInvoice.invoiceNumber}`,
        entryDate: newInvoice.invoiceDate,
        postingDate: newInvoice.invoiceDate,
        status: 'Posted',
        description: `Sales Invoice ${newInvoice.invoiceNumber} to ${newInvoice.customerName}`,
        reference: newInvoice.invoiceNumber,
        createdBy: this.state.currentUser.id,
        createdByName: this.state.currentUser.fullName,
        postedBy: this.state.currentUser.id,
        postedAt: new Date().toISOString(),
        totalDebitPaise: newInvoice.totalPaise,
        totalCreditPaise: newInvoice.totalPaise,
        lines: [
          {
            id: `line-${Date.now()}-1`,
            accountId: receivableAcc.id,
            accountName: receivableAcc.name,
            accountCode: receivableAcc.code,
            debitPaise: newInvoice.totalPaise,
            creditPaise: 0,
            description: `Receivable from ${newInvoice.customerName}`,
          },
          {
            id: `line-${Date.now()}-2`,
            accountId: revenueAcc.id,
            accountName: revenueAcc.name,
            accountCode: revenueAcc.code,
            debitPaise: 0,
            creditPaise: newInvoice.subtotalPaise,
            description: 'Sales Revenue',
          },
        ],
      };

      newInvoice.postedJournalId = journal.id;
      this.state.journalEntries.push(journal);
      this.state.accounts = applyJournalToAccounts(journal, this.state.accounts);
    }

    this.recordAuditEvent(
      'ISSUE_INVOICE',
      'Invoice',
      newInvoice.id,
      null,
      { invoiceNumber: newInvoice.invoiceNumber, totalPaise: newInvoice.totalPaise }
    );

    this.persist();
    return newInvoice;
  }

  // Record Customer Payment against Invoice
  public recordInvoicePayment(
    invoiceId: string,
    amountPaise: number,
    bankAccountId: string,
    utrReference: string
  ): { success: boolean; error?: string } {
    const inv = this.state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found' };

    const bank = this.state.bankAccounts.find((b) => b.id === bankAccountId);
    if (!bank) return { success: false, error: 'Bank account not found' };

    inv.amountPaidPaise += amountPaise;
    if (inv.amountPaidPaise >= inv.totalPaise) {
      inv.status = 'Paid';
    } else {
      inv.status = 'Partially Paid';
    }

    const cust = this.state.customers.find((c) => c.id === inv.customerId);
    if (cust) {
      cust.outstandingBalancePaise = Math.max(0, cust.outstandingBalancePaise - amountPaise);
    }

    bank.currentBalancePaise += amountPaise;

    this.recordAuditEvent(
      'RECORD_PAYMENT',
      'Invoice',
      inv.id,
      { amountPaid: inv.amountPaidPaise - amountPaise },
      { amountPaid: inv.amountPaidPaise, utr: utrReference }
    );

    this.persist();
    return { success: true };
  }

  // Record Bank Transfer
  public recordBankTransfer(
    sourceBankId: string,
    destBankId: string,
    amountPaise: number,
    referenceNumber: string
  ): { success: boolean; error?: string } {
    if (sourceBankId === destBankId) {
      return { success: false, error: 'Source and destination bank accounts cannot be the same.' };
    }
    const source = this.state.bankAccounts.find((b) => b.id === sourceBankId);
    const dest = this.state.bankAccounts.find((b) => b.id === destBankId);
    if (!source || !dest) return { success: false, error: 'Bank account not found' };

    if (source.currentBalancePaise < amountPaise) {
      return { success: false, error: 'Insufficient balance in source bank account.' };
    }

    source.currentBalancePaise -= amountPaise;
    dest.currentBalancePaise += amountPaise;

    this.recordAuditEvent(
      'BANK_TRANSFER',
      'BankAccount',
      source.id,
      null,
      { from: source.accountName, to: dest.accountName, amount: amountPaise, ref: referenceNumber }
    );

    this.persist();
    return { success: true };
  }

  // Trigger Scheduled Report
  public triggerScheduledReport(scheduleId: string): { success: boolean; log: ReportExecutionLog } {
    const sched = this.state.reportSchedules.find((s) => s.id === scheduleId);
    const now = new Date().toISOString();

    const log: ReportExecutionLog = {
      id: `log-${Date.now()}`,
      scheduleId,
      reportName: sched ? sched.reportName : 'Scheduled Report',
      executedAt: now,
      status: 'Success',
      recipients: sched ? sched.recipientEmails : [],
      fileSizeKb: Math.floor(Math.random() * 40) + 50,
    };

    if (sched) {
      sched.lastRunAt = now;
    }

    this.state.reportExecutionLogs.unshift(log);

    this.recordAuditEvent(
      'EXECUTE_SCHEDULED_REPORT',
      'ReportSchedule',
      scheduleId,
      null,
      { recipients: log.recipients, status: 'Success' }
    );

    this.persist();
    return { success: true, log };
  }

  // Add Document
  public addDocument(doc: { name: string; category: string; size: string; hash: string }) {
    const newDoc = {
      id: `doc-${Date.now()}`,
      ...doc,
      uploadedBy: this.state.currentUser.fullName,
      date: new Date().toISOString().split('T')[0],
      status: 'Verified',
    };
    this.state.documents.unshift(newDoc);
    this.persist();
    return newDoc;
  }

  // Add Budget Item
  public addBudget(budget: { name: string; costCentre: string; budgetPaise: number }) {
    const newBudget = {
      id: `bgt-${Date.now()}`,
      ...budget,
      actualPaise: 0,
    };
    this.state.budgets.push(newBudget);
    this.persist();
    return newBudget;
  }

  // Add Approval Policy
  public addApprovalPolicy(policyData: Omit<ApprovalPolicy, 'id'>) {
    const newPolicy: ApprovalPolicy = {
      id: `pol-${Date.now()}`,
      ...policyData,
    };
    this.state.approvalPolicies.push(newPolicy);
    this.recordAuditEvent('CREATE_APPROVAL_POLICY', 'ApprovalPolicy', newPolicy.id, null, {
      name: newPolicy.name,
      approverRole: newPolicy.approverRole,
      minAmountPaise: newPolicy.minAmountPaise,
      maxAmountPaise: newPolicy.maxAmountPaise,
    });
    this.persist();
    return newPolicy;
  }

  // Add Report Schedule
  public addReportSchedule(scheduleData: Omit<ReportSchedule, 'id'>) {
    const newSched: ReportSchedule = {
      id: `sched-${Date.now()}`,
      ...scheduleData,
    };
    this.state.reportSchedules.push(newSched);
    this.recordAuditEvent('CREATE_REPORT_SCHEDULE', 'ReportSchedule', newSched.id, null, {
      reportName: newSched.reportName,
      reportType: newSched.reportType,
      frequency: newSched.frequency,
      recipients: newSched.recipientEmails,
    });
    this.persist();
    return newSched;
  }

  // Delete Report Schedule
  public deleteReportSchedule(scheduleId: string): { success: boolean } {
    const sched = this.state.reportSchedules.find((s) => s.id === scheduleId);
    this.state.reportSchedules = this.state.reportSchedules.filter((s) => s.id !== scheduleId);
    if (sched) {
      this.recordAuditEvent(
        'DELETE_REPORT_SCHEDULE',
        'ReportSchedule',
        scheduleId,
        { reportName: sched.reportName },
        null
      );
    }
    this.persist();
    return { success: true };
  }

  // Add Vendor Bill
  public addVendorBill(
    billData: Omit<VendorBill, 'id' | 'organizationId' | 'status' | 'amountPaidPaise' | 'createdAt'>
  ): VendorBill {
    const id = `bill-${Date.now()}`;
    const orgId = this.state.organization?.id || 'org-default';
    const newBill: VendorBill = {
      ...billData,
      id,
      organizationId: orgId,
      status: 'Approved',
      amountPaidPaise: 0,
      createdAt: new Date().toISOString(),
    };

    this.state.vendorBills.unshift(newBill);

    const vend = this.state.vendors.find((v) => v.id === newBill.vendorId);
    if (vend) {
      vend.outstandingBalancePaise += newBill.totalPaise;
    }

    // Auto-create balanced journal entry
    const payableAcc = this.state.accounts.find((a) => a.code === '2010');
    const expenseAcc = this.state.accounts.find((a) => a.type === 'Expense');

    if (payableAcc && expenseAcc) {
      const jeId = `je-bill-${Date.now()}`;
      const journal: JournalEntry = {
        id: jeId,
        organizationId: orgId,
        entryNumber: `JE-BILL-${newBill.billNumber}`,
        entryDate: newBill.billDate,
        postingDate: newBill.billDate,
        status: 'Posted',
        description: `Vendor Bill ${newBill.billNumber} from ${newBill.vendorName}`,
        reference: newBill.billNumber,
        createdBy: this.state.currentUser.id,
        createdByName: this.state.currentUser.fullName,
        postedBy: this.state.currentUser.id,
        postedAt: new Date().toISOString(),
        totalDebitPaise: newBill.totalPaise,
        totalCreditPaise: newBill.totalPaise,
        lines: [
          {
            id: `line-${Date.now()}-1`,
            accountId: expenseAcc.id,
            accountName: expenseAcc.name,
            accountCode: expenseAcc.code,
            debitPaise: newBill.subtotalPaise,
            creditPaise: 0,
            description: `Expense: ${newBill.vendorName}`,
          },
          {
            id: `line-${Date.now()}-2`,
            accountId: payableAcc.id,
            accountName: payableAcc.name,
            accountCode: payableAcc.code,
            debitPaise: 0,
            creditPaise: newBill.totalPaise,
            description: `Trade Creditors: ${newBill.vendorName}`,
          },
        ],
      };

      this.state.journalEntries.push(journal);
      this.state.accounts = applyJournalToAccounts(journal, this.state.accounts);
    }

    this.recordAuditEvent('CREATE_VENDOR_BILL', 'VendorBill', newBill.id, null, {
      billNumber: newBill.billNumber,
      vendorName: newBill.vendorName,
      totalPaise: newBill.totalPaise,
    });

    this.persist();

    if (typeof window !== 'undefined') {
      fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_VENDOR_BILL',
          payload: newBill,
        }),
      }).catch(() => {});
    }

    return newBill;
  }

  // Review Vendor Bill
  public reviewVendorBill(
    billId: string,
    decision: 'Approved' | 'Rejected' | 'Returned',
    comment?: string
  ): { success: boolean; error?: string } {
    const bill = this.state.vendorBills.find((b) => b.id === billId);
    if (!bill) return { success: false, error: 'Vendor bill not found' };

    const prevStatus = bill.status;
    bill.status = decision === 'Approved' ? 'Approved' : decision === 'Rejected' ? 'Rejected' : 'Draft';

    this.recordAuditEvent(
      `DECIDE_VENDOR_BILL_${decision.toUpperCase()}`,
      'VendorBill',
      bill.id,
      { status: prevStatus },
      { status: bill.status, approver: this.state.currentUser.fullName },
      comment
    );

    this.persist();

    if (typeof window !== 'undefined') {
      fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVIEW_VENDOR_BILL',
          payload: { id: billId, decision, approver: this.state.currentUser, comment },
        }),
      }).catch(() => {});
    }

    return { success: true };
  }

  // Add Bank Statement Line
  public addBankStatementLine(
    lineData: Omit<BankStatementLine, 'id'>
  ): BankStatementLine {
    const id = `stmt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLine: BankStatementLine = {
      ...lineData,
      id,
    };

    this.state.bankStatementLines.unshift(newLine);
    this.persist();
    return newLine;
  }

  // Update Current User Profile
  public updateCurrentUser(updates: Partial<UserProfile>) {
    this.state.currentUser = { ...this.state.currentUser, ...updates };
    const idx = this.state.users.findIndex((u) => u.id === this.state.currentUser.id);
    if (idx !== -1) {
      this.state.users[idx] = { ...this.state.currentUser };
    }
    this.persist();
  }

  // Record Audit Event
  public recordAuditEvent(
    action: string,
    entityType: string,
    entityId: string,
    prevState?: Record<string, unknown> | null,
    newState?: Record<string, unknown> | null,
    reason?: string
  ): AuditEvent {
    const lastEvent = this.state.auditEvents[this.state.auditEvents.length - 1];
    const prevHash = lastEvent ? lastEvent.hash : 'sha256-genesis-0000000000';
    const timestamp = new Date().toISOString();
    const eventId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const hash = computeSyncHash(
      prevHash,
      timestamp,
      this.state.currentUser.id,
      action,
      entityType,
      entityId,
      newState
    );

    const orgId = this.state.organization?.id || 'org-default';

    const event: AuditEvent = {
      id: eventId,
      organizationId: orgId,
      actorId: this.state.currentUser.id,
      actorName: this.state.currentUser.fullName,
      action,
      entityType,
      entityId,
      prevState,
      newState,
      reason,
      hash,
      prevHash,
      timestamp,
    };

    this.state.auditEvents.push(event);
    this.persist();
    return event;
  }
}

export const globalDataStore = new DataStore();
