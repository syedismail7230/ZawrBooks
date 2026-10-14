import fs from 'fs';
import path from 'path';
import {
  Account,
  ApprovalPolicy,
  AuditEvent,
  Customer,
  ExpenseSubmission,
  Invoice,
  JournalEntry,
  Organization,
  UserProfile,
  Vendor,
  VendorBill,
} from '@/types';

import { defaultOrganization, defaultStandardAccounts } from './defaultData';
export { defaultOrganization, defaultStandardAccounts };

export interface ServerStoreState {
  organization: Organization;
  accounts: Account[];
  expenses: ExpenseSubmission[];
  vendorBills: VendorBill[];
  invoices: Invoice[];
  customers: Customer[];
  vendors: Vendor[];
  journalEntries: JournalEntry[];
  approvalPolicies: ApprovalPolicy[];
  auditEvents: AuditEvent[];
  lastUpdated: string;
}

class ServerStore {
  private dataDir: string;
  private storeFile: string;
  private orgFile: string;
  private cachedState: ServerStoreState | null = null;

  constructor() {
    this.dataDir = path.join(process.cwd(), '.data');
    this.storeFile = path.join(this.dataDir, 'store.json');
    this.orgFile = path.join(this.dataDir, 'organization.json');
    this.ensureInitialized();
  }

  private ensureInitialized() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Check organization file
      if (!fs.existsSync(this.orgFile)) {
        fs.writeFileSync(this.orgFile, JSON.stringify(defaultOrganization, null, 2), 'utf-8');
      }

      // Check store file
      if (!fs.existsSync(this.storeFile)) {
        const initial: ServerStoreState = {
          organization: defaultOrganization,
          accounts: [...defaultStandardAccounts],
          expenses: [],
          vendorBills: [],
          invoices: [],
          customers: [],
          vendors: [],
          journalEntries: [],
          approvalPolicies: [],
          auditEvents: [],
          lastUpdated: new Date().toISOString(),
        };
        fs.writeFileSync(this.storeFile, JSON.stringify(initial, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('[SERVER STORE] Initialization warning:', e);
    }
  }

  public getOrganization(): Organization {
    try {
      if (fs.existsSync(this.orgFile)) {
        const raw = fs.readFileSync(this.orgFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SERVER STORE] Read org error:', e);
    }
    return defaultOrganization;
  }

  public saveOrganization(org: Partial<Organization>): Organization {
    try {
      const current = this.getOrganization();
      const updated: Organization = {
        ...current,
        ...org,
        name: org.name || current.name,
        legalName: org.legalName || org.name || current.legalName,
        gstin: org.gstin ?? current.gstin,
        pan: org.pan ?? current.pan,
        currency: org.currency || current.currency || 'INR',
        timezone: org.timezone || current.timezone || 'Asia/Kolkata',
      };

      fs.writeFileSync(this.orgFile, JSON.stringify(updated, null, 2), 'utf-8');

      // Also update in store state
      const state = this.getStoreState();
      state.organization = updated;
      this.saveStoreState(state);

      return updated;
    } catch (e) {
      console.error('[SERVER STORE] Save org error:', e);
      return defaultOrganization;
    }
  }

  public getStoreState(): ServerStoreState {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf-8');
        const parsed = JSON.parse(raw);
        const org = this.getOrganization();
        const accounts = (parsed.accounts && parsed.accounts.length > 0) ? parsed.accounts : [...defaultStandardAccounts];

        this.cachedState = {
          ...parsed,
          organization: org,
          accounts,
          expenses: parsed.expenses || [],
          vendorBills: parsed.vendorBills || [],
          invoices: parsed.invoices || [],
          customers: parsed.customers || [],
          vendors: parsed.vendors || [],
          journalEntries: parsed.journalEntries || [],
          approvalPolicies: parsed.approvalPolicies || [],
          auditEvents: parsed.auditEvents || [],
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
        return this.cachedState!;
      }
    } catch (e) {
      console.warn('[SERVER STORE] Read store error:', e);
    }

    const org = this.getOrganization();
    return {
      organization: org,
      accounts: [...defaultStandardAccounts],
      expenses: [],
      vendorBills: [],
      invoices: [],
      customers: [],
      vendors: [],
      journalEntries: [],
      approvalPolicies: [],
      auditEvents: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  public saveStoreState(partialState: Partial<ServerStoreState>): ServerStoreState {
    try {
      const current = this.getStoreState();
      const updated: ServerStoreState = {
        ...current,
        ...partialState,
        organization: partialState.organization || current.organization,
        accounts: partialState.accounts || current.accounts,
        expenses: partialState.expenses || current.expenses,
        vendorBills: partialState.vendorBills || current.vendorBills,
        invoices: partialState.invoices || current.invoices,
        customers: partialState.customers || current.customers,
        vendors: partialState.vendors || current.vendors,
        journalEntries: partialState.journalEntries || current.journalEntries,
        approvalPolicies: partialState.approvalPolicies || current.approvalPolicies,
        auditEvents: partialState.auditEvents || current.auditEvents,
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.storeFile, JSON.stringify(updated, null, 2), 'utf-8');
      this.cachedState = updated;
      return updated;
    } catch (e) {
      console.error('[SERVER STORE] Save store error:', e);
      return this.getStoreState();
    }
  }

  public submitExpense(expense: ExpenseSubmission): ExpenseSubmission {
    const state = this.getStoreState();
    const existingIndex = state.expenses.findIndex((e) => e.id === expense.id);
    if (existingIndex >= 0) {
      state.expenses[existingIndex] = expense;
    } else {
      state.expenses.unshift(expense);
    }
    this.saveStoreState({ expenses: state.expenses });
    return expense;
  }

  public reviewExpense(
    id: string,
    decision: 'Approved' | 'Rejected' | 'Returned',
    approver: UserProfile,
    comment?: string
  ): { success: boolean; expense?: ExpenseSubmission; error?: string } {
    const state = this.getStoreState();
    const exp = state.expenses.find((e) => e.id === id);
    if (!exp) return { success: false, error: 'Expense not found' };

    exp.status = decision;
    exp.approverId = approver.id;
    exp.approverName = approver.fullName;
    exp.approvedAt = new Date().toISOString();

    if (comment) {
      exp.comments = exp.comments || [];
      exp.comments.push({
        author: approver.fullName,
        text: comment,
        createdAt: new Date().toISOString(),
      });
    }

    this.saveStoreState({ expenses: state.expenses });
    return { success: true, expense: exp };
  }

  public addVendorBill(bill: VendorBill): VendorBill {
    const state = this.getStoreState();
    const existingIndex = state.vendorBills.findIndex((b) => b.id === bill.id);
    if (existingIndex >= 0) {
      state.vendorBills[existingIndex] = bill;
    } else {
      state.vendorBills.unshift(bill);
    }
    this.saveStoreState({ vendorBills: state.vendorBills });
    return bill;
  }

  public reviewVendorBill(
    id: string,
    decision: 'Approved' | 'Rejected' | 'Returned',
    approver: UserProfile,
    comment?: string
  ): { success: boolean; bill?: VendorBill; error?: string } {
    const state = this.getStoreState();
    const bill = state.vendorBills.find((b) => b.id === id);
    if (!bill) return { success: false, error: 'Vendor bill not found' };

    bill.status = decision === 'Approved' ? 'Open' : decision === 'Rejected' ? 'Void' : 'Draft';
    // Add audit notation
    this.saveStoreState({ vendorBills: state.vendorBills });
    return { success: true, bill };
  }
}

export const serverStore = new ServerStore();
