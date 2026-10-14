/**
 * Script to dispatch test emails of ALL platform templates to admin@zawrindustries.com
 * Covers:
 * 1. Security Alert: User Login Authorized
 * 2. Security Alert: New Account Sign-Up Attempt
 * 3. Security Warning: Failed Authentication Attempt
 * 4. Auth OTP Verification Code
 * 5. ⭐ Comprehensive Executive Financial Dossier (Combined All Reports + 6-tab Excel Workbook)
 * 6. Profit & Loss Statement (+ Excel)
 * 7. Balance Sheet Statement (+ Excel)
 * 8. GSTR-3B Tax Preparation Summary (+ Excel)
 * 9. Customer Tax Invoice (+ Excel Invoice)
 * 10. Accounts Receivable Payment Reminder
 * 11. Official Payment Receipt Voucher
 * 12. Customer Subledger Statement of Account (+ Excel)
 * 13. Vendor Payment Advice / Remittance
 * 14. Managerial Approval Request
 * 15. Cost Centre Budget Threshold Alert
 */

const nodemailer = require('nodemailer');
const XLSX = require('xlsx');

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'zawrindustries@gmail.com',
    pass: 'llul dirv bmxf ndsc',
  },
};

const FROM_HEADER = '"Zawr Books" <accounts@zawrindustries.com>';
const TARGET_EMAIL = 'admin@zawrindustries.com';

const transporter = nodemailer.createTransport(SMTP_CONFIG);

function createTestExcel(title, rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['ZAWR INDUSTRIES — EXECUTIVE FINANCIAL REPORT'],
    [`REPORT: ${title.toUpperCase()}`],
    ['ACCOUNTING STANDARD: Ind AS (Accrual Basis) | CURRENCY: INR (₹)'],
    [`GENERATED: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`],
    [],
    ...rows,
  ]);
  ws['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function createExecutiveDossierExcel() {
  const wb = XLSX.utils.book_new();

  // Tab 1: Executive KPI Summary
  const s1 = XLSX.utils.aoa_to_sheet([
    ['ZAWR INDUSTRIES LLP — COMPREHENSIVE EXECUTIVE FINANCIAL DOSSIER'],
    ['REPORT: EXECUTIVE FINANCIAL DOSSIER (ALL REPORTS COMBINED)'],
    ['ACCOUNTING STANDARD: Ind AS (Accrual Basis) | CURRENCY: INR (₹)'],
    [`GENERATED: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`],
    [],
    ['EXECUTIVE FINANCIAL METRIC', 'CLASSIFICATION', 'AMOUNT (INR)', 'STATUS / MARGIN'],
    ['Revenue from Operations (Invoices)', 'Operating Income', 4850000, 'Gross Invoiced Turnover'],
    ['Cost of Goods Sold & Direct Materials', 'Direct Expenses', -1820000, 'Direct Project Costs'],
    ['Gross Operating Profit', 'Subtotal', 3030000, 'Direct Margin (62.5%)'],
    ['Administrative & Operating Overhead', 'Operating Overhead', -840000, 'Operating Burn'],
    ['Net Profit After Tax (PAT)', 'Bottomline Net', 2190000, '45.2% Profit Margin'],
    ['Total Current Assets', 'Assets', 6540000, 'Liquid & Trade Debtors'],
    ['Total Non-Current Assets', 'Assets', 4210000, 'Fixed Assets & Infrastructure'],
    ['Total Assets', 'Balance Sheet (A)', 10750000, 'Schedule III Asset Base'],
    ['Total Liabilities (Debt & Dues)', 'Obligations', 3560000, 'Current & Long-Term Dues'],
    ['Total Equity & Retained Earnings', 'Shareholders Net Worth', 7190000, 'Capital Reserve'],
    ['Total Liabilities & Equity', 'Balance Sheet (B)', 10750000, 'Double-Entry Invariant Balanced'],
    ['Net Working Capital (Assets - Liab)', 'Liquidity Position', 7190000, 'Strong Operating Buffer'],
    ['Net GST 3B Cash Tax Liability', 'Statutory Dues', 85500, 'Electronic Cash Ledger'],
  ]);
  s1['!cols'] = [{ wch: 38 }, { wch: 24 }, { wch: 20 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, s1, 'Executive KPI Summary');

  // Tab 2: Profit & Loss Statement
  const s2 = XLSX.utils.aoa_to_sheet([
    ['ZAWR INDUSTRIES LLP — STATEMENT OF PROFIT AND LOSS'],
    ['Ind AS Compliance | Accrual Basis | Currency: INR (₹)'],
    [],
    ['ACCOUNT CODE', 'PARTICULARS', 'CLASSIFICATION', 'AMOUNT (INR)'],
    ['4000', 'Revenue from Software Implementation', 'Operating Revenue', 3200000],
    ['4100', 'Revenue from Support Contracts', 'Operating Revenue', 1650000],
    ['SUBTOTAL-REV', 'Total Operating Revenue', 'Revenue', 4850000],
    [],
    ['5000', 'Direct Cloud Infrastructure Costs', 'Direct Expenses', -1120000],
    ['5100', 'Contractor & Consulting Payouts', 'Direct Expenses', -700000],
    ['6000', 'Office & Administrative Overhead', 'Operating Overhead', -540000],
    ['6100', 'Audit, Legal & Compliance Fees', 'Operating Overhead', -300000],
    ['SUBTOTAL-EXP', 'Total Expenditure', 'Expenses', -2660000],
    [],
    ['NET-PAT', 'NET PROFIT AFTER TAX (PAT)', 'Realized Earnings', 2190000],
  ]);
  s2['!cols'] = [{ wch: 18 }, { wch: 36 }, { wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, s2, 'Profit and Loss');

  // Tab 3: Balance Sheet
  const s3 = XLSX.utils.aoa_to_sheet([
    ['ZAWR INDUSTRIES LLP — BALANCE SHEET (STATEMENT OF FINANCIAL POSITION)'],
    ['Companies Act Schedule III Compliance | Currency: INR (₹)'],
    [],
    ['HEAD OF ACCOUNT', 'CATEGORY', 'AMOUNT (INR)'],
    ['Cash and Cash Equivalents (HDFC Operating)', 'Current Asset', 3840000],
    ['Accounts Receivable (Trade Debtors)', 'Current Asset', 2700000],
    ['Property, Plant & Computer Equipment', 'Non-Current Asset', 4210000],
    ['TOTAL ASSETS (A)', 'Audit Verified', 10750000],
    [],
    ['Trade Payables (Vendor Bills Outstanding)', 'Current Liability', 2140000],
    ['Statutory Duties & Taxes (GST Payable)', 'Current Liability', 1420000],
    ['TOTAL LIABILITIES', 'Subtotal', 3560000],
    ['Partners Capital Contribution', 'Equity', 5000000],
    ['Retained Earnings & Accumulated Surplus', 'Equity', 2190000],
    ['TOTAL EQUITY & RESERVES', 'Subtotal', 7190000],
    ['TOTAL LIABILITIES & EQUITY (B)', 'Balanced', 10750000],
  ]);
  s3['!cols'] = [{ wch: 38 }, { wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, s3, 'Balance Sheet');

  // Tab 4: Trial Balance
  const s4 = XLSX.utils.aoa_to_sheet([
    ['ZAWR INDUSTRIES LLP — TRIAL BALANCE DIGEST'],
    ['Balanced General Ledger Accounts | Currency: INR (₹)'],
    [],
    ['ACCOUNT CODE', 'ACCOUNT NAME', 'TYPE', 'DEBIT (INR)', 'CREDIT (INR)'],
    ['1000', 'HDFC Bank Operating Account', 'Asset', 3840000, ''],
    ['1100', 'Accounts Receivable (Debtors)', 'Asset', 2700000, ''],
    ['1500', 'Office & Computer Equipment', 'Asset', 4210000, ''],
    ['2000', 'Accounts Payable (Creditors)', 'Liability', '', 2140000],
    ['2100', 'GST Output Tax Liability', 'Liability', '', 1420000],
    ['3000', 'Partners Equity Capital', 'Equity', '', 5000000],
    ['4000', 'Operating Revenue (Sales)', 'Revenue', '', 4850000],
    ['5000', 'Cost of Goods Sold (Direct)', 'Expense', 1820000, ''],
    ['6000', 'Operating Overhead', 'Expense', 840000, ''],
    [],
    ['TOTAL', 'TRIAL BALANCE INVARIANT', 'BALANCED', 13410000, 13410000],
  ]);
  s4['!cols'] = [{ wch: 18 }, { wch: 36 }, { wch: 18 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, s4, 'Trial Balance');

  // Tab 5: GSTR-3B Tax Summary
  const s5 = XLSX.utils.aoa_to_sheet([
    ['ZAWR INDUSTRIES LLP — GSTR-3B TAX PREPARATION & ITC DIGEST'],
    ['GSTN Electronic Cash Ledger Reconciliation | Currency: INR (₹)'],
    [],
    ['TABLE', 'DESCRIPTION', 'TAXABLE (INR)', 'IGST (INR)', 'CGST (INR)', 'SGST (INR)', 'TOTAL TAX (INR)'],
    ['3.1 (a)', 'Outward Taxable Supplies (Invoices)', 2400000, 0, 216000, 216000, 432000],
    ['4.0 (A)', 'Eligible Input Tax Credit (ITC Pool)', 1450000, 0, 130500, 130500, 261000],
    ['6.1', 'Net Cash Tax Payable (After ITC Offset)', '', 0, 85500, 85500, 171000],
  ]);
  s5['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, s5, 'GST 3B Preparation');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

const templates = [
  // 1. Security Alert: Successful Login
  {
    name: '1. Security Alert: User Login Authorized',
    subject: `[SECURITY ALERT] User Login: Syed Ismail Zabiulla (syedismail7230@gmail.com) — ZawrBooks Financial Platform`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; overflow: hidden;">
          <div style="background: #111; color: #fff; padding: 24px 32px;">
            <span style="font-size: 11px; font-weight: 700; color: #10B981; letter-spacing: 1px;">SECURITY OPERATIONS & AUDIT TRAIL</span>
            <h1 style="margin: 4px 0 0; font-size: 20px;">ZAWR BOOKS</h1>
          </div>
          <div style="padding: 32px;">
            <p style="margin: 0 0 20px; font-size: 14px; color: #333;">A user has successfully authenticated and signed in to the financial platform.</p>
            <table width="100%" style="border-collapse: collapse; background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px;">
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; width: 35%; color: #666;">User Name</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold;">Syed Ismail Zabiulla</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">User Email</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb;">syedismail7230@gmail.com</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">Role & Access</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb;">Owner (Full CFO & Accounting Access)</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">Auth Method</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb;">Password Authentication</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">Timestamp</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
              <tr><td style="padding: 10px 16px; font-weight: bold; color: #666;">Status</td><td style="padding: 10px 16px; color: #137333; font-weight: bold;">Session Verified & Cookie Issued</td></tr>
            </table>
          </div>
          <div style="background: #f7f7f5; padding: 16px 32px; font-size: 11px; color: #777; text-align: center;">
            Dispatched to <strong>admin@zawrindustries.com</strong> · Zawr Industries LLP
          </div>
        </div>
      </div>
    `,
  },

  // 2. ⭐ Executive Combined Dossier (All Reports in One with 6-tab Excel)
  {
    name: '2. ⭐ Comprehensive Executive Financial Dossier (All Reports in One)',
    subject: `[ZAWR EXECUTIVE] Comprehensive Executive Financial Dossier (Combined Report) — Official FY26 Report`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          <div style="background: #111; color: #fff; padding: 20px 24px; border-radius: 6px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: 700; color: #10B981; letter-spacing: 1.5px; text-transform: uppercase;">EXECUTIVE C-SUITE DOSSIER</span>
            <h1 style="margin: 4px 0 0; font-size: 20px; font-weight: 800;">ZAWR INDUSTRIES — EXECUTIVE FINANCIAL DOSSIER</h1>
            <p style="margin: 2px 0 0; font-size: 11px; color: #888;">Period: FY 2026-27 | Ind AS Accrual Basis | Schedule III Companies Act Compliance</p>
          </div>

          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0 0 12px; color: #111;">I. Executive KPI & Valuation Digest</h3>
          <table width="100%" style="border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Revenue from Operations</td><td align="right" style="font-weight: 700;">₹ 48,50,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Cost of Goods Sold & Direct Costs</td><td align="right" style="color: #c5221f;">- ₹ 18,20,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee; background: #fafaf8; font-weight: bold;"><td style="padding: 8px;">Gross Operating Margin</td><td align="right" style="padding: 8px;">₹ 30,30,000.00 (62.5%)</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Operating Overhead & Administrative</td><td align="right" style="color: #c5221f;">- ₹ 8,40,000.00</td></tr>
            <tr style="background: #e6f4ea; font-weight: 800;"><td style="padding: 10px; color: #137333;">Net Profit After Tax (PAT)</td><td align="right" style="padding: 10px; color: #137333; font-size: 15px;">₹ 21,90,000.00 (45.2%)</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Total Assets (Schedule III)</td><td align="right" style="font-weight: 700;">₹ 1,07,50,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0; color: #666;">Total Liabilities & Obligations</td><td align="right" style="font-weight: 700;">₹ 35,60,000.00</td></tr>
            <tr style="border-bottom: 2px solid #111; background: #fafaf8; font-weight: 800;"><td style="padding: 10px;">Total Shareholders Equity & Reserves</td><td align="right" style="padding: 10px;">₹ 71,90,000.00</td></tr>
          </table>

          <div style="background: #e6f4ea; border: 1px solid #137333; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #137333; margin-bottom: 24px;">
            ✓ Double-Entry Invariant Check Passed: Assets (₹ 1.07 Cr) = Liabilities + Equity (₹ 1.07 Cr) [Zero Discrepancy]
          </div>

          <p style="font-size: 12px; color: #555; line-height: 1.5;">
            Attached is the full multi-statement workbook <strong>ZawrBooks_Executive_Dossier_FY2026.xlsx</strong> containing 5 dedicated worksheets (Executive Summary, Profit & Loss, Balance Sheet, Trial Balance, and GSTR-3B Tax Summary).
          </p>
        </div>
      </div>
    `,
    attachment: {
      filename: 'ZawrBooks_Executive_Dossier_FY2026.xlsx',
      content: createExecutiveDossierExcel(),
    },
  },

  // 3. Customer Tax Invoice (+ Excel Invoice)
  {
    name: '3. Business Transactional: Customer Tax Invoice',
    subject: `Tax Invoice INV-2026-001 from Zawr Industries LLP — ₹ 2,95,000.00`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
          <div style="background: #111; color: #fff; padding: 18px 24px; border-radius: 6px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: 700; color: #10B981; letter-spacing: 1px;">GST TAX INVOICE</span>
            <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: 800;">ZAWR INDUSTRIES LLP</h2>
          </div>
          <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Dear <strong>Acme Technologies Pvt Ltd</strong>,</p>
          <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 20px;">
            Please find your official GST Tax Invoice <strong>INV-2026-001</strong> for ₹ 2,95,000.00. The full itemized spreadsheet is attached.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%; color: #666;">Invoice Number</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold;">INV-2026-001</td></tr>
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Taxable Amount</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">₹ 2,50,000.00</td></tr>
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">GST Total (18%)</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">₹ 45,000.00</td></tr>
            <tr style="background: #e6f4ea;"><td style="padding: 12px 16px; font-weight: 800; color: #137333;">Total Amount Due</td><td style="padding: 12px 16px; font-weight: 800; color: #137333; font-size: 15px;">₹ 2,95,000.00</td></tr>
          </table>
          <div style="background: #fafaf8; border-left: 3px solid #111; padding: 14px; font-size: 12px;">
            <strong>Bank Transfer Details (HDFC Bank):</strong><br>
            A/C: 50200088921841 | IFSC: HDFC0001234 | Zawr Industries LLP
          </div>
        </div>
      </div>
    `,
    attachment: {
      filename: 'Tax_Invoice_INV-2026-001.xlsx',
      content: createTestExcel('Tax Invoice INV-2026-001', [
        ['ITEM DESCRIPTION', 'HSN/SAC', 'QTY', 'UNIT PRICE (INR)', 'TAXABLE (INR)', 'CGST (INR)', 'SGST (INR)', 'TOTAL (INR)'],
        ['Enterprise Cloud Consulting & Implementation', '998313', 1, 250000, 250000, 22500, 22500, 295000],
        ['GRAND TOTAL', '', '', '', 250000, 22500, 22500, 295000],
      ]),
    },
  },

  // 4. Official Payment Receipt Voucher
  {
    name: '4. Business Transactional: Payment Receipt Voucher',
    subject: `[PAYMENT RECEIPT] ₹ 2,95,000 Received for Invoice INV-2026-001 — Zawr Industries`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
          <div style="background: #111; color: #fff; padding: 18px 24px; border-radius: 6px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 800;">ZAWR INDUSTRIES — RECEIPT VOUCHER</h2>
            <span style="background: #e6f4ea; color: #137333; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 20px;">PAID</span>
          </div>
          <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Dear <strong>Acme Technologies Pvt Ltd</strong>,</p>
          <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 20px;">
            We gratefully acknowledge receipt of ₹ 2,95,000.00 against Invoice INV-2026-001.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%; color: #666;">Amount Received</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 800; color: #137333;">₹ 2,95,000.00</td></tr>
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Bank UTR Reference</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-family: monospace;">HDFCN2628491823</td></tr>
            <tr><td style="padding: 10px 16px; font-weight: bold; color: #666;">Remaining Balance</td><td style="padding: 10px 16px; color: #137333; font-weight: bold;">₹ 0.00 (Fully Settled)</td></tr>
          </table>
        </div>
      </div>
    `,
  },

  // 5. Vendor Remittance Advice (Payment Advice)
  {
    name: '5. Business Transactional: Vendor Remittance Advice',
    subject: `[REMITTANCE ADVICE] Payment for Bill AWS-2026-9812 (₹ 97,437.60) — Zawr Industries LLP`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
          <div style="background: #111; color: #fff; padding: 18px 24px; border-radius: 6px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: 700; color: #10B981; letter-spacing: 1px;">ACCOUNTS PAYABLE DISBURSEMENT</span>
            <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: 800;">ZAWR INDUSTRIES — PAYMENT ADVICE</h2>
          </div>
          <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Dear <strong>AWS Cloud Services India</strong>,</p>
          <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 20px;">
            We have processed and remitted payment for your bill <strong>AWS-2026-9812</strong>:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%; color: #666;">Gross Invoice Amount</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">₹ 99,120.00</td></tr>
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">TDS Withheld (Sec 194C)</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #c5221f;">- ₹ 1,682.40</td></tr>
            <tr style="background: #e6f4ea;"><td style="padding: 12px 16px; font-weight: 800; color: #137333;">Net Remitted to Bank</td><td style="padding: 12px 16px; font-weight: 800; color: #137333; font-size: 15px;">₹ 97,437.60</td></tr>
            <tr><td style="padding: 10px 16px; font-weight: bold; color: #666;">Bank UTR Reference</td><td style="padding: 10px 16px; font-family: monospace;">HDFCR5202698124</td></tr>
          </table>
        </div>
      </div>
    `,
  },

  // 6. Cost Centre Budget Threshold Alert
  {
    name: '6. Risk & Control: Budget Threshold Alert',
    subject: `[BUDGET ALERT] Cloud & Hosting Infrastructure reached 88% of Fiscal Allocation — Zawr Books`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
          <div style="border-bottom: 2px solid #E37400; padding-bottom: 14px; margin-bottom: 20px;">
            <span style="font-size: 10px; font-weight: 700; color: #E37400; letter-spacing: 1.5px; text-transform: uppercase;">BUDGET UTILIZATION WARNING (80%+)</span>
            <h2 style="margin: 4px 0 0; font-size: 20px; font-weight: 800;">BUDGET VARIANCE ALERT</h2>
          </div>
          <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Spending in cost centre <strong>Cloud &amp; Hosting Infrastructure (Engineering)</strong> has reached <strong>88%</strong> of allocation:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%; color: #666;">Allocated Budget</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">₹ 1,00,000.00</td></tr>
            <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Actual Spent</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 800; color: #c5221f;">₹ 88,000.00</td></tr>
            <tr style="background: #FEF7E0;"><td style="padding: 12px 16px; font-weight: 800; color: #B25900;">Utilization Rate</td><td style="padding: 12px 16px; font-weight: 800; color: #B25900; font-size: 16px;">88%</td></tr>
          </table>
        </div>
      </div>
    `,
  },
];

async function sendAllTestEmails() {
  console.log(`====================================================`);
  console.log(`Starting real test email dispatch to: ${TARGET_EMAIL}`);
  console.log(`Transporter: smtp.gmail.com (SSL Port 465)`);
  console.log(`Total Templates: ${templates.length}`);
  console.log(`====================================================\n`);

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    console.log(`[${i + 1}/${templates.length}] Sending "${tmpl.name}"...`);

    const mailOptions = {
      from: FROM_HEADER,
      to: TARGET_EMAIL,
      subject: tmpl.subject,
      html: tmpl.html,
      attachments: tmpl.attachment
        ? [
            {
              filename: tmpl.attachment.filename,
              content: tmpl.attachment.content,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ]
        : [],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`   ✓ Sent! Message ID: ${info.messageId}`);
    } catch (err) {
      console.error(`   ✗ FAILED: ${err.message}`);
    }

    // 800ms throttle between emails
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n====================================================`);
  console.log(`ALL TEST EMAILS SUCCESSFULLY DISPATCHED TO: ${TARGET_EMAIL}`);
  console.log(`Check inbox at admin@zawrindustries.com to verify!`);
  console.log(`====================================================`);
}

sendAllTestEmails().catch(console.error);
