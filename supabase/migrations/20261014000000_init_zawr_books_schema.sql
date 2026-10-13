-- ZAWR BOOKS DATABASE SCHEMA MIGRATION
-- Compatible with Supabase PostgreSQL 15+
-- Version: 1.0 (2026-10-14)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. IDENTITY & ORGANIZATION
-- ==========================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    pan VARCHAR(10) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    fy_start_month SMALLINT DEFAULT 4, -- 4 for April (India)
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    period_locked_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- matches auth.users.id
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE user_role_enum AS ENUM (
    'owner',
    'director',
    'finance_admin',
    'accountant',
    'approver',
    'employee',
    'auditor'
);

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role_enum NOT NULL DEFAULT 'employee',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    gstin VARCHAR(15),
    address TEXT
);

CREATE TABLE IF NOT EXISTS cost_centres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 2. CHART OF ACCOUNTS & DOUBLE-ENTRY ENGINE
-- ==========================================

CREATE TYPE account_type_enum AS ENUM (
    'Asset',
    'Liability',
    'Equity',
    'Revenue',
    'Expense'
);

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type account_type_enum NOT NULL,
    sub_type VARCHAR(100) NOT NULL,
    balance_paise BIGINT DEFAULT 0, -- Monetary values stored in paise (1 INR = 100 paise)
    currency VARCHAR(3) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE TYPE journal_status_enum AS ENUM (
    'Draft',
    'Submitted',
    'Posted',
    'Reversed'
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    posting_date DATE,
    status journal_status_enum NOT NULL DEFAULT 'Draft',
    description TEXT NOT NULL,
    reference VARCHAR(100),
    reversal_of_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES profiles(id),
    posted_by UUID REFERENCES profiles(id),
    posted_at TIMESTAMPTZ,
    total_debit_paise BIGINT NOT NULL,
    total_credit_paise BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_journal_balanced CHECK (
        status != 'Posted' OR total_debit_paise = total_credit_paise
    ),
    UNIQUE(organization_id, entry_number)
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit_paise BIGINT NOT NULL DEFAULT 0,
    credit_paise BIGINT NOT NULL DEFAULT 0,
    description TEXT,
    cost_centre_id UUID REFERENCES cost_centres(id),
    CONSTRAINT chk_positive_lines CHECK (debit_paise >= 0 AND credit_paise >= 0),
    CONSTRAINT chk_debit_or_credit CHECK (
        (debit_paise > 0 AND credit_paise = 0) OR
        (credit_paise > 0 AND debit_paise = 0) OR
        (debit_paise = 0 AND credit_paise = 0)
    )
);

-- ==========================================
-- 3. EXPENSES, RECEIPTS & OCR
-- ==========================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ocr_provider VARCHAR(50) NOT NULL,
    raw_payload JSONB,
    confidence_score NUMERIC(5, 4),
    status VARCHAR(50) DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE expense_status_enum AS ENUM (
    'Draft',
    'Submitted',
    'Under Review',
    'Approved',
    'Posted',
    'Returned',
    'Rejected',
    'Reversed'
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES profiles(id),
    title VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_gstin VARCHAR(15),
    invoice_number VARCHAR(100),
    invoice_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    subtotal_paise BIGINT NOT NULL,
    cgst_paise BIGINT DEFAULT 0,
    sgst_paise BIGINT DEFAULT 0,
    igst_paise BIGINT DEFAULT 0,
    cess_paise BIGINT DEFAULT 0,
    total_tax_paise BIGINT DEFAULT 0,
    grand_total_paise BIGINT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    is_reimbursable BOOLEAN DEFAULT TRUE,
    business_purpose TEXT,
    status expense_status_enum NOT NULL DEFAULT 'Draft',
    document_id UUID REFERENCES documents(id),
    posted_journal_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. SALES, INVOICES & CUSTOMERS
-- ==========================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    billing_address TEXT NOT NULL,
    credit_limit_paise BIGINT DEFAULT 0,
    outstanding_balance_paise BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE invoice_status_enum AS ENUM (
    'Draft',
    'Issued',
    'Partially Paid',
    'Paid',
    'Overdue',
    'Cancelled'
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status_enum NOT NULL DEFAULT 'Draft',
    subtotal_paise BIGINT NOT NULL,
    cgst_paise BIGINT DEFAULT 0,
    sgst_paise BIGINT DEFAULT 0,
    igst_paise BIGINT DEFAULT 0,
    total_paise BIGINT NOT NULL,
    amount_paid_paise BIGINT DEFAULT 0,
    notes TEXT,
    terms TEXT,
    posted_journal_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hsn_sac VARCHAR(20),
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price_paise BIGINT NOT NULL,
    discount_paise BIGINT DEFAULT 0,
    tax_rate_percent NUMERIC(5, 2) DEFAULT 18.0,
    taxable_amount_paise BIGINT NOT NULL,
    cgst_paise BIGINT DEFAULT 0,
    sgst_paise BIGINT DEFAULT 0,
    igst_paise BIGINT DEFAULT 0,
    total_paise BIGINT NOT NULL
);

-- ==========================================
-- 5. PURCHASES, VENDORS & BILLS
-- ==========================================

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    billing_address TEXT NOT NULL,
    outstanding_balance_paise BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    bill_number VARCHAR(100) NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    subtotal_paise BIGINT NOT NULL,
    tax_paise BIGINT DEFAULT 0,
    total_paise BIGINT NOT NULL,
    amount_paid_paise BIGINT DEFAULT 0,
    document_id UUID REFERENCES documents(id),
    posted_journal_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. BANKING & RECONCILIATION
-- ==========================================

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number_masked VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    account_type VARCHAR(20) DEFAULT 'Bank', -- 'Bank' or 'Cash'
    current_balance_paise BIGINT DEFAULT 0,
    gl_account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_number VARCHAR(100), -- UTR or Bank Ref
    debit_paise BIGINT DEFAULT 0,
    credit_paise BIGINT DEFAULT 0,
    balance_paise BIGINT NOT NULL,
    is_reconciled BOOLEAN DEFAULT FALSE,
    matched_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. APPROVAL POLICIES & AUDIT LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS approval_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    min_amount_paise BIGINT DEFAULT 0,
    max_amount_paise BIGINT NOT NULL,
    category VARCHAR(100),
    department VARCHAR(100),
    approver_role user_role_enum NOT NULL,
    prohibit_self_approval BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id),
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    prev_state JSONB,
    new_state JSONB,
    reason TEXT,
    hash VARCHAR(64) NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to prevent UPDATE or DELETE on audit_events (Tamper-evident immutability)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail records are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Trigger to prevent UPDATE or DELETE on posted journal entries
CREATE OR REPLACE FUNCTION prevent_posted_journal_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Posted' THEN
        RAISE EXCEPTION 'Posted journal entries are strictly immutable. Create a reversing journal entry to correct errors.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posted_journal_immutable
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_posted_journal_modification();

-- ==========================================
-- 8. SCHEDULED REPORTS & EXECUTION LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    recipient_emails TEXT[] NOT NULL,
    output_format VARCHAR(10) DEFAULT 'PDF',
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
    report_name VARCHAR(100) NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) NOT NULL,
    recipients TEXT[] NOT NULL,
    file_size_kb INT DEFAULT 0,
    error_message TEXT
);

-- ==========================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

-- Helper to fetch current user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS SETOF UUID AS $$
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER;

-- Organization isolation policy on all core tables
CREATE POLICY org_isolation_accounts ON accounts
    FOR ALL USING (organization_id IN (SELECT get_user_organizations()));

CREATE POLICY org_isolation_journals ON journal_entries
    FOR ALL USING (organization_id IN (SELECT get_user_organizations()));

CREATE POLICY org_isolation_expenses ON expenses
    FOR ALL USING (organization_id IN (SELECT get_user_organizations()));

CREATE POLICY org_isolation_invoices ON invoices
    FOR ALL USING (organization_id IN (SELECT get_user_organizations()));

CREATE POLICY org_isolation_audit ON audit_events
    FOR SELECT USING (organization_id IN (SELECT get_user_organizations()));
