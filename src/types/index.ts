export type UserRole =
  | 'owner'
  | 'director'
  | 'finance_admin'
  | 'accountant'
  | 'approver'
  | 'employee'
  | 'auditor';

export type Permission =
  | 'view_records'
  | 'create_drafts'
  | 'edit_drafts'
  | 'submit_transactions'
  | 'approve_transactions'
  | 'post_entries'
  | 'reverse_entries'
  | 'manage_documents'
  | 'view_reports'
  | 'export_financials'
  | 'manage_users'
  | 'change_settings';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  bankDetails?: string;
  phone?: string;
  passwordHash?: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  pan: string;
  currency: string; // 'INR'
  fyStartMonth: number; // 4 for April (Indian Financial Year)
  timezone: string; // 'Asia/Kolkata'
  periodLockedUntil?: string; // ISO date string
  createdAt: string;
}

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string;
  balancePaise: number; // in paise (1 INR = 100 paise)
  isActive: boolean;
  currency: string;
}

export type JournalStatus = 'Draft' | 'Submitted' | 'Posted' | 'Reversed';

export interface JournalLine {
  id: string;
  accountId: string;
  accountName?: string;
  accountCode?: string;
  debitPaise: number;
  creditPaise: number;
  description: string;
  costCentreId?: string;
}

export interface JournalEntry {
  id: string;
  organizationId: string;
  entryNumber: string;
  entryDate: string;
  postingDate?: string;
  status: JournalStatus;
  description: string;
  reference?: string;
  lines: JournalLine[];
  reversalOfEntryId?: string;
  createdBy: string;
  createdByName?: string;
  postedBy?: string;
  postedAt?: string;
  totalDebitPaise: number;
  totalCreditPaise: number;
}

export type ExpenseStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Posted'
  | 'Returned'
  | 'Rejected'
  | 'Reversed';

export interface ExtractedField<T = string | number> {
  value: T;
  confidence: number; // 0.0 - 1.0
  isVerified?: boolean;
}

export interface ExtractedReceiptData {
  merchantName: ExtractedField<string>;
  vendorGstin?: ExtractedField<string>;
  invoiceNumber: ExtractedField<string>;
  invoiceDate: ExtractedField<string>;
  documentType: ExtractedField<string>;
  currency: ExtractedField<string>;
  subtotalPaise: ExtractedField<number>;
  taxableAmountPaise: ExtractedField<number>;
  cgstPaise: ExtractedField<number>;
  sgstPaise: ExtractedField<number>;
  igstPaise: ExtractedField<number>;
  cessPaise?: ExtractedField<number>;
  totalTaxPaise: ExtractedField<number>;
  grandTotalPaise: ExtractedField<number>;
  paymentMethod?: ExtractedField<string>;
  transactionReference?: ExtractedField<string>;
  categorySuggestion: ExtractedField<string>;
  hsnSac?: ExtractedField<string>;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPricePaise: number;
    taxRate: number;
    amountPaise: number;
  }>;
}

export interface ExpenseSubmission {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  vendorName: string;
  vendorGstin?: string;
  invoiceNumber: string;
  invoiceDate: string;
  category: string;
  department: string;
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  totalTaxPaise: number;
  grandTotalPaise: number;
  isTaxIncluded: boolean;
  businessPurpose: string;
  paymentMethod: string;
  isReimbursable: boolean;
  reimbursementStatus?: 'Pending' | 'Processed' | 'Not Applicable';
  status: ExpenseStatus;
  documentId?: string;
  documentUrl?: string;
  extractedData?: ExtractedReceiptData;
  comments?: Array<{
    author: string;
    text: string;
    createdAt: string;
  }>;
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  postedJournalId?: string;
  createdAt: string;
}

export type InvoiceStatus =
  | 'Draft'
  | 'Issued'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unitPricePaise: number;
  discountPaise: number;
  taxRatePercent: number; // e.g. 18
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  billingAddress: string;
  creditLimitPaise: number;
  outstandingBalancePaise: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  totalPaise: number;
  amountPaidPaise: number;
  notes?: string;
  terms?: string;
  postedJournalId?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  billingAddress: string;
  outstandingBalancePaise: number;
}

export interface VendorBill {
  id: string;
  organizationId: string;
  vendorId: string;
  vendorName: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  status: 'Draft' | 'Approved' | 'Partially Paid' | 'Paid' | 'Overdue';
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  amountPaidPaise: number;
  documentId?: string;
  postedJournalId?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  organizationId: string;
  accountName: string;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
  accountType: 'Bank' | 'Cash';
  currentBalancePaise: number;
  glAccountId: string;
}

export interface BankStatementLine {
  id: string;
  bankAccountId: string;
  transactionDate: string;
  description: string;
  referenceNumber: string; // UTR or Ref
  debitPaise: number;
  creditPaise: number;
  balancePaise: number;
  isReconciled: boolean;
  matchedTransactionId?: string;
}

export interface ApprovalPolicy {
  id: string;
  organizationId: string;
  name: string;
  minAmountPaise: number;
  maxAmountPaise: number;
  category?: string;
  department?: string;
  approverRole: UserRole;
  prohibitSelfApproval: boolean;
  isActive: boolean;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  action: string; // e.g. "POST_JOURNAL", "APPROVE_EXPENSE", "REVERSE_ENTRY"
  entityType: string;
  entityId: string;
  prevState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string;
  hash: string;
  prevHash: string;
  timestamp: string;
}

export type ReportType =
  | 'ProfitLoss'
  | 'BalanceSheet'
  | 'CashFlow'
  | 'TrialBalance'
  | 'GeneralLedger'
  | 'GSTSummary'
  | 'ARAgeing'
  | 'APAgeing'
  | 'DayBook'
  | 'AuditTrail';

export interface ReportSchedule {
  id: string;
  organizationId: string;
  reportName: string;
  reportType: ReportType;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  recipientEmails: string[];
  outputFormat: 'PDF' | 'CSV' | 'Excel';
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt: string;
}

export interface ReportExecutionLog {
  id: string;
  scheduleId: string;
  reportName: string;
  executedAt: string;
  status: 'Success' | 'Failed';
  recipients: string[];
  fileSizeKb: number;
  errorMessage?: string;
}
