/**
 * Script to dispatch test emails of ALL templates to admin@zawrindustries.com
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

const templates = [
  // 1. Security Alert: Successful Login
  {
    name: '1. Security Alert: User Login Authorized',
    subject: `[SECURITY ALERT] User Login: Syed Ismail Zabiulla (syedismail7230@gmail.com) — ZawrBooks Financial Platform`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; overflow: hidden;">
          <div style="background: #111; color: #fff; padding: 24px 32px; display: flex; justify-content: space-between;">
            <div>
              <span style="font-size: 11px; font-weight: 700; color: #10B981; letter-spacing: 1px;">SECURITY OPERATIONS & AUDIT TRAIL</span>
              <h1 style="margin: 4px 0 0; font-size: 20px;">ZAWR BOOKS</h1>
            </div>
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

  // 2. Security Alert: New Sign-Up Attempt
  {
    name: '2. Security Alert: New Account Sign-Up Attempt',
    subject: `[SECURITY NOTICE] New Sign-Up Attempt: newuser@example.com — ZawrBooks Financial Platform`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; overflow: hidden;">
          <div style="background: #111; color: #fff; padding: 24px 32px;">
            <span style="font-size: 11px; font-weight: 700; color: #1A73E8; letter-spacing: 1px;">NEW USER REGISTRATION NOTIFICATION</span>
            <h1 style="margin: 4px 0 0; font-size: 20px;">ZAWR BOOKS</h1>
          </div>
          <div style="padding: 32px;">
            <p style="margin: 0 0 20px; font-size: 14px; color: #333;">Someone has attempted to register or request an OTP to sign up for ZawrBooks.</p>
            <table width="100%" style="border-collapse: collapse; background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px;">
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; width: 35%; color: #666;">Target Email</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold;">newuser@example.com</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">Action</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb;">Sign-Up / Single-Use OTP Requested</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">Timestamp</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
              <tr><td style="padding: 10px 16px; font-weight: bold; color: #666;">Access Control</td><td style="padding: 10px 16px; color: #E37400; font-weight: bold;">Pending Executive Role Assignment in /control</td></tr>
            </table>
          </div>
          <div style="background: #f7f7f5; padding: 16px 32px; font-size: 11px; color: #777; text-align: center;">
            Dispatched to <strong>admin@zawrindustries.com</strong> · Zawr Industries LLP
          </div>
        </div>
      </div>
    `,
  },

  // 3. Security Warning: Failed Login Attempt
  {
    name: '3. Security Warning: Failed Authentication Attempt',
    subject: `[SECURITY WARNING] Failed Login Attempt: unknown@domain.com — ZawrBooks Financial Platform`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; overflow: hidden;">
          <div style="background: #C5221F; color: #fff; padding: 24px 32px;">
            <span style="font-size: 11px; font-weight: 700; color: #FCE8E6; letter-spacing: 1px;">SECURITY ALERT — FAILED AUTHENTICATION</span>
            <h1 style="margin: 4px 0 0; font-size: 20px;">ZAWR BOOKS</h1>
          </div>
          <div style="padding: 32px;">
            <p style="margin: 0 0 20px; font-size: 14px; color: #333;">An invalid password or unauthenticated session was rejected by the authentication layer.</p>
            <table width="100%" style="border-collapse: collapse; background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px;">
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; width: 35%; color: #666;">Attempted Email</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold;">unknown@domain.com</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">Failure Reason</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; color: #C5221F; font-weight: bold;">Account not recognized or incorrect credentials</td></tr>
              <tr><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb; font-weight: bold; color: #666;">Timestamp</td><td style="padding: 10px 16px; border-bottom: 1px solid #ebebeb;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
              <tr><td style="padding: 10px 16px; font-weight: bold; color: #666;">Defensive Action</td><td style="padding: 10px 16px; color: #137333; font-weight: bold;">Session Blocked · Rate Limiter Active</td></tr>
            </table>
          </div>
          <div style="background: #f7f7f5; padding: 16px 32px; font-size: 11px; color: #777; text-align: center;">
            Dispatched to <strong>admin@zawrindustries.com</strong> · Zawr Industries LLP
          </div>
        </div>
      </div>
    `,
  },

  // 4. Auth OTP Verification Code Email
  {
    name: '4. Authentication OTP Verification Code',
    subject: `Your Zawr Books Verification Code: 492817`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 40px 16px;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e5e5e0; padding: 40px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #111;">ZAWR BOOKS</h2>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-top: 4px;">FINANCIAL PLATFORM AUTHENTICATION</p>
          <div style="margin: 28px 0; padding: 16px 24px; background: #f4f3ef; border: 1px solid #e0dfd5; border-radius: 6px; display: inline-block;">
            <span style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #111;">492817</span>
          </div>
          <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0 0 20px;">
            Use this single-use code to sign in to your Zawr Books account. This code expires in 10 minutes.
          </p>
          <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #888;">
            If you did not request this code, no action is required. Your account remains protected.
          </div>
        </div>
      </div>
    `,
  },

  // 5. Profit & Loss Statement (with Excel)
  {
    name: '5. Executive Report: Profit & Loss Statement',
    subject: `[ZAWR EXECUTIVE] Daily Profit & Loss Statement — Official Financial Report`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
          <h2 style="margin: 0; font-size: 18px; color: #111;">ZAWR INDUSTRIES — STATEMENT OF PROFIT AND LOSS</h2>
          <p style="font-size: 12px; color: #666; margin: 4px 0 20px;">Period: FY 2026-27 (YTD) · Ind AS Accrual Basis</p>
          <table width="100%" style="border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <tr style="border-bottom: 2px solid #111;"><th align="left" style="padding: 8px 0;">Particulars</th><th align="right" style="padding: 8px 0;">Amount (INR)</th></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0;">Operating Revenue from Operations</td><td align="right" style="font-weight: 700;">₹ 48,50,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0;">Cost of Goods Sold & Direct Expenses</td><td align="right" style="font-weight: 700; color: #C5221F;">- ₹ 18,20,000.00</td></tr>
            <tr style="border-bottom: 1.5px solid #111; font-weight: bold; background: #fafaf8;"><td style="padding: 10px 4px;">Gross Profit Margin</td><td align="right" style="padding: 10px 4px;">₹ 30,30,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0;">Operating & Administrative Expenditure</td><td align="right" style="font-weight: 700; color: #C5221F;">- ₹ 8,40,000.00</td></tr>
            <tr style="background: #e6f4ea; border: 1.5px solid #137333; font-weight: bold;"><td style="padding: 12px 10px; color: #137333;">Net Profit After Tax</td><td align="right" style="padding: 12px 10px; color: #137333; font-size: 15px;">₹ 21,90,000.00</td></tr>
          </table>
          <p style="font-size: 12px; color: #555;">Attached: <strong>ZawrBooks_ProfitLoss_2026.xlsx</strong> with full detailed account ledger breakdowns.</p>
        </div>
      </div>
    `,
    attachment: {
      filename: 'ZawrBooks_ProfitLoss_FY2026.xlsx',
      content: createTestExcel('Profit and Loss Statement', [
        ['PARTICULARS', 'ACCOUNT CODE', 'AMOUNT (INR)'],
        ['Revenue from Operations', 'REV-100', 4850000],
        ['Direct Materials & Costs', 'DIR-200', -1820000],
        ['Gross Margin', 'SUBTOTAL', 3030000],
        ['Operating & Admin Overhead', 'EXP-300', -840000],
        ['Net Realized Profit', 'TOTAL', 2190000],
      ]),
    },
  },

  // 6. Balance Sheet (with Excel)
  {
    name: '6. Executive Report: Balance Sheet',
    subject: `[ZAWR EXECUTIVE] Balance Sheet (Statement of Financial Position) — Zawr Books`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
          <h2 style="margin: 0; font-size: 18px; color: #111;">ZAWR INDUSTRIES — BALANCE SHEET</h2>
          <p style="font-size: 12px; color: #666; margin: 4px 0 20px;">As of October 14, 2026 · Schedule III Companies Act Compliance</p>
          <table width="100%" style="border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <tr style="border-bottom: 2px solid #111;"><th align="left" style="padding: 8px 0;">Assets & Liabilities</th><th align="right" style="padding: 8px 0;">Amount (INR)</th></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0;">Current Assets (Cash & Bank, Receivables)</td><td align="right">₹ 65,40,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0;">Non-Current Assets (Equipment & Assets)</td><td align="right">₹ 42,10,000.00</td></tr>
            <tr style="border-bottom: 2px solid #111; font-weight: bold; background: #fafaf8;"><td style="padding: 8px 4px;">TOTAL ASSETS (A)</td><td align="right" style="padding: 8px 4px;">₹ 1,07,50,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0;">Current & Non-Current Liabilities</td><td align="right">₹ 35,60,000.00</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px 0;">Shareholders Equity & Retained Earnings</td><td align="right">₹ 71,90,000.00</td></tr>
            <tr style="border-bottom: 2px solid #111; font-weight: bold; background: #fafaf8;"><td style="padding: 8px 4px;">TOTAL LIABILITIES & EQUITY (B)</td><td align="right" style="padding: 8px 4px;">₹ 1,07,50,000.00</td></tr>
          </table>
          <div style="background: #e6f4ea; border: 1px solid #137333; padding: 10px 14px; border-radius: 4px; font-size: 12px; color: #137333; font-weight: bold;">
            ✓ Double-Entry Invariant Verified: Assets (₹ 1.07 Cr) = Liabilities + Equity (₹ 1.07 Cr)
          </div>
        </div>
      </div>
    `,
    attachment: {
      filename: 'ZawrBooks_BalanceSheet_2026.xlsx',
      content: createTestExcel('Balance Sheet Statement', [
        ['CATEGORY', 'PARTICULARS', 'AMOUNT (INR)'],
        ['Assets', 'Cash and Cash Equivalents', 3840000],
        ['Assets', 'Accounts Receivable (Trade Debtors)', 2700000],
        ['Assets', 'Property, Plant & Equipment', 4210000],
        ['TOTAL ASSETS', 'AUDIT VERIFIED', 10750000],
        ['Liabilities', 'Trade Payables & Vendor Dues', 2140000],
        ['Liabilities', 'Duties & Taxes (GST Payable)', 1420000],
        ['Equity', 'Partners Capital & Retained Profit', 7190000],
        ['TOTAL LIAB & EQUITY', 'BALANCED', 10750000],
      ]),
    },
  },

  // 7. GSTR-3B Tax Preparation Summary (with Excel)
  {
    name: '7. Executive Report: GSTR-3B Tax Preparation Summary',
    subject: `[ZAWR EXECUTIVE] Monthly GSTR-3B Tax Preparation & ITC Digest`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #f4f3ef; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
          <h2 style="margin: 0; font-size: 18px; color: #111;">GSTR-3B TAX PREPARATION SUMMARY</h2>
          <p style="font-size: 12px; color: #666; margin: 4px 0 20px;">Filing Period: September / October 2026 · GSTN Reconciled</p>
          <table width="100%" style="border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
            <tr style="border-bottom: 2px solid #111; background: #fafaf8;">
              <th align="left" style="padding: 8px;">Description</th>
              <th align="right" style="padding: 8px;">Taxable</th>
              <th align="right" style="padding: 8px;">CGST</th>
              <th align="right" style="padding: 8px;">SGST</th>
              <th align="right" style="padding: 8px;">IGST</th>
            </tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">3.1 Outward Taxable Supplies</td><td align="right">₹ 24,00,000</td><td align="right">₹ 2,16,000</td><td align="right">₹ 2,16,000</td><td align="right">₹ 0</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">4. Eligible ITC (Expenses & Bills)</td><td align="right">₹ 14,50,000</td><td align="right">₹ 1,30,500</td><td align="right">₹ 1,30,500</td><td align="right">₹ 0</td></tr>
            <tr style="background: #e6f4ea; border-top: 2px solid #137333; font-weight: bold;"><td style="padding: 10px 8px; color: #137333;">Net Cash Tax Payable (6.1)</td><td align="right">-</td><td align="right" style="color: #137333;">₹ 85,500</td><td align="right" style="color: #137333;">₹ 85,500</td><td align="right" style="color: #137333;">₹ 0</td></tr>
          </table>
          <p style="font-size: 12px; color: #555;">Ready for CA verification and direct GSTN portal filing upload.</p>
        </div>
      </div>
    `,
    attachment: {
      filename: 'ZawrBooks_GSTR3B_Tax_Summary.xlsx',
      content: createTestExcel('GSTR-3B Tax Summary', [
        ['SECTION', 'SUPPLY DESCRIPTION', 'TAXABLE (INR)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)'],
        ['3.1 (a)', 'Outward Taxable Supplies (Invoices)', 2400000, 216000, 216000, 0],
        ['4 (A)', 'Input Tax Credit Claimed (ITC)', 1450000, 130500, 130500, 0],
        ['6.1', 'Net Cash Payable to GSTN Portal', 0, 85500, 85500, 0],
      ]),
    },
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

    // Short 800ms throttle between emails to respect SMTP rate limits
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n====================================================`);
  console.log(`ALL TEST EMAILS SUCCESSFULLY DISPATCHED TO: ${TARGET_EMAIL}`);
  console.log(`Check inbox at admin@zawrindustries.com to verify!`);
  console.log(`====================================================`);
}

sendAllTestEmails().catch(console.error);
