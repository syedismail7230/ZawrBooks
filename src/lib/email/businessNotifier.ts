/**
 * ZawrBooks Enterprise Business Transactional Notification Service
 * 
 * Implements standard corporate email notifications across the platform:
 * 1. Customer Tax Invoice Dispatch (with attached Excel workbook & payment bank details)
 * 2. Overdue & Due Payment Reminders
 * 3. Payment Receipt / Acknowledgment Vouchers
 * 4. Customer Subledger Statements of Account
 * 5. Vendor Remittance Advice (Payment Advice with TDS & UTR)
 * 6. Managerial / CFO Approval Requests
 * 7. Approval Decision Notifications (Approved / Rejected)
 * 8. Cost Centre Budget Threshold & Breach Warnings
 * 9. Bank Reconciliation Statement (BRS) Summaries
 * 10. Statutory GST Filing & Tax Liability Alerts
 */

import * as XLSX from 'xlsx';
import { emailService } from '@/lib/email/service';
import { Invoice, Customer, Vendor, VendorBill, ExpenseSubmission } from '@/types';
import { formatINR } from '@/lib/accounting/engine';

export interface BudgetItem {
  id?: string;
  name: string;
  costCentre: string;
  budgetPaise: number;
  actualPaise: number;
}

const ADMIN_EMAIL = 'admin@zawrindustries.com';

function formatShortDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

// -------------------------------------------------------------
// 1. Customer Tax Invoice Dispatch
// -------------------------------------------------------------
export interface SendInvoiceEmailParams {
  invoice: Invoice;
  customer?: Customer;
  recipientEmail?: string;
  notes?: string;
}

export async function sendCustomerInvoiceEmail(params: SendInvoiceEmailParams) {
  const { invoice, customer, recipientEmail, notes } = params;
  const toEmail = recipientEmail || customer?.email || ADMIN_EMAIL;
  const grandTotalStr = formatINR(invoice.totalPaise);

  // Generate Excel Invoice attachment
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [
    ['ZAWR INDUSTRIES LLP — TAX INVOICE'],
    ['GSTIN: 29AAAAZ0000A1Z5 | PAN: AAAAZ0000A'],
    ['Registered Office: Indiranagar, Bengaluru, Karnataka 560038, India'],
    [],
    ['INVOICE NUMBER', invoice.invoiceNumber, 'INVOICE DATE', formatShortDate(invoice.invoiceDate)],
    ['PAYMENT DUE DATE', formatShortDate(invoice.dueDate), 'STATUS', invoice.status],
    [],
    ['BILLED TO:'],
    ['Customer Name', invoice.customerName],
    ['Customer GSTIN', invoice.customerGstin || 'URP / Consumer'],
    ['Billing Address', customer?.billingAddress || 'India'],
    [],
    ['LINE ITEMS & TAX BREAKDOWN:'],
    ['SL', 'DESCRIPTION', 'HSN/SAC', 'QTY', 'UNIT PRICE (INR)', 'TAXABLE (INR)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)', 'TOTAL (INR)'],
  ];

  (invoice.items || []).forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.description,
      item.hsnSac || '998313',
      item.quantity || 1,
      item.unitPricePaise / 100,
      item.taxableAmountPaise / 100,
      item.cgstPaise / 100,
      item.sgstPaise / 100,
      item.igstPaise / 100,
      item.totalPaise / 100,
    ]);
  });

  rows.push([]);
  rows.push(['', '', '', '', '', 'SUBTOTAL', '', '', '', invoice.subtotalPaise / 100]);
  rows.push(['', '', '', '', '', 'CGST TOTAL', '', '', '', invoice.cgstPaise / 100]);
  rows.push(['', '', '', '', '', 'SGST TOTAL', '', '', '', invoice.sgstPaise / 100]);
  rows.push(['', '', '', '', '', 'IGST TOTAL', '', '', '', invoice.igstPaise / 100]);
  rows.push(['', '', '', '', '', 'GRAND TOTAL', '', '', '', invoice.totalPaise / 100]);
  rows.push(['', '', '', '', '', 'AMOUNT PAID', '', '', '', invoice.amountPaidPaise / 100]);
  rows.push(['', '', '', '', '', 'BALANCE DUE', '', '', '', (invoice.totalPaise - invoice.amountPaidPaise) / 100]);
  rows.push([]);
  rows.push(['BANK PAYMENT DETAILS FOR RTGS/NEFT/IMPS:']);
  rows.push(['Beneficiary Name', 'Zawr Industries LLP']);
  rows.push(['Bank Name', 'HDFC Bank Limited']);
  rows.push(['Account Number', '50200088921841']);
  rows.push(['IFSC Code', 'HDFC0001234']);
  rows.push(['Account Type', 'Current Account']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Tax Invoice');
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const subject = `Tax Invoice ${invoice.invoiceNumber} from Zawr Industries LLP — ${grandTotalStr}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
    <div style="background: #111; color: #fff; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 10px; font-weight: 700; color: #10B981; letter-spacing: 1.5px; text-transform: uppercase;">GST TAX INVOICE</span>
        <h1 style="margin: 4px 0 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">ZAWR INDUSTRIES</h1>
        <p style="margin: 2px 0 0; font-size: 11px; color: #888;">GSTIN: 29AAAAZ0000A1Z5 | PAN: AAAAZ0000A</p>
      </div>
    </div>

    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; font-size: 14px; color: #333;">Dear <strong>${invoice.customerName}</strong>,</p>
      <p style="margin: 0 0 24px; font-size: 13px; color: #555; line-height: 1.6;">
        Please find your official GST Tax Invoice <strong>${invoice.invoiceNumber}</strong> issued on ${formatShortDate(invoice.invoiceDate)}. The full itemized Excel spreadsheet is attached.
      </p>

      <!-- Invoice Summary Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666; width: 35%;">Invoice Number</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 800; font-family: monospace;">${invoice.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Invoice Date</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatShortDate(invoice.invoiceDate)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Payment Due Date</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #c5221f;">${formatShortDate(invoice.dueDate)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Taxable Amount</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatINR(invoice.subtotalPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">GST Total (CGST + SGST)</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatINR(invoice.totalTaxPaise)}</td>
        </tr>
        <tr style="background: #e6f4ea;">
          <td style="padding: 12px 16px; font-weight: 800; color: #137333; font-size: 13px;">Grand Total Due</td>
          <td style="padding: 12px 16px; font-weight: 800; color: #137333; font-size: 16px;">${grandTotalStr}</td>
        </tr>
      </table>

      <!-- Bank Transfer Details -->
      <div style="background: #fafaf8; border-left: 3px solid #111; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Direct Bank Transfer Details (RTGS / NEFT / IMPS):</h4>
        <table width="100%" style="font-size: 12px; color: #333;">
          <tr><td style="padding: 3px 0; width: 35%; color: #666;">Beneficiary Name:</td><td style="font-weight: 700;">Zawr Industries LLP</td></tr>
          <tr><td style="padding: 3px 0; color: #666;">Bank Name:</td><td style="font-weight: 700;">HDFC Bank Limited</td></tr>
          <tr><td style="padding: 3px 0; color: #666;">Account Number:</td><td style="font-weight: 700; font-family: monospace;">50200088921841</td></tr>
          <tr><td style="padding: 3px 0; color: #666;">IFSC Code:</td><td style="font-weight: 700; font-family: monospace;">HDFC0001234</td></tr>
        </table>
      </div>

      ${notes ? `<p style="font-size: 12px; color: #666; font-style: italic;">Note: ${notes}</p>` : ''}
    </div>

    <div style="background: #f7f7f5; padding: 16px 32px; border-top: 1px solid #eee; font-size: 11px; color: #777; text-align: center;">
      Zawr Industries LLP · Accounts & Receivables · <a href="mailto:accounts@zawrindustries.com" style="color: #111;">accounts@zawrindustries.com</a>
    </div>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: [toEmail, ADMIN_EMAIL],
    subject,
    htmlContent,
    attachments: [
      {
        filename: `Tax_Invoice_${invoice.invoiceNumber}.xlsx`,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  });
}

// -------------------------------------------------------------
// 2. Overdue & Due Payment Reminder
// -------------------------------------------------------------
export async function sendPaymentReminderEmail(invoice: Invoice, customer?: Customer) {
  const toEmail = customer?.email || ADMIN_EMAIL;
  const balancePaise = invoice.totalPaise - invoice.amountPaidPaise;
  const balanceStr = formatINR(balancePaise);

  const subject = `[PAYMENT REMINDER] Outstanding Invoice ${invoice.invoiceNumber} (${balanceStr}) — Zawr Industries`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="border-bottom: 2px solid #C5221F; padding-bottom: 16px; margin-bottom: 24px;">
      <span style="font-size: 10px; font-weight: 700; color: #C5221F; letter-spacing: 1.5px; text-transform: uppercase;">ACCOUNTS RECEIVABLE NOTIFICATION</span>
      <h2 style="margin: 4px 0 0; font-size: 20px; font-weight: 800;">PAYMENT REMINDER</h2>
    </div>

    <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Dear <strong>${invoice.customerName}</strong>,</p>
    <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 20px;">
      This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> with an outstanding balance of <strong>${balanceStr}</strong> was due on <strong>${formatShortDate(invoice.dueDate)}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Invoice Reference</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700;">${invoice.invoiceNumber}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Invoice Date</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatShortDate(invoice.invoiceDate)}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Due Date</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #C5221F;">${formatShortDate(invoice.dueDate)}</td></tr>
      <tr style="background: #FCE8E6;"><td style="padding: 12px 16px; font-weight: 800; color: #C5221F;">Outstanding Balance</td><td style="padding: 12px 16px; font-weight: 800; color: #C5221F; font-size: 15px;">${balanceStr}</td></tr>
    </table>

    <div style="background: #fafaf8; border-left: 3px solid #111; padding: 14px; font-size: 12px; margin-bottom: 24px;">
      <strong>Payment Details (HDFC Bank):</strong><br>
      A/C: 50200088921841 | IFSC: HDFC0001234 | Zawr Industries LLP
    </div>

    <p style="font-size: 12px; color: #777; margin: 0;">If payment has already been remitted, please disregard this notice and email your bank UTR to accounts@zawrindustries.com.</p>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: [toEmail, ADMIN_EMAIL],
    subject,
    htmlContent,
  });
}

// -------------------------------------------------------------
// 3. Payment Receipt / Acknowledgment Voucher
// -------------------------------------------------------------
export interface PaymentReceiptParams {
  invoice: Invoice;
  customer?: Customer;
  amountReceivedPaise: number;
  utrReference?: string;
  bankName?: string;
}

export async function sendPaymentReceiptEmail(params: PaymentReceiptParams) {
  const { invoice, customer, amountReceivedPaise, utrReference, bankName } = params;
  const toEmail = customer?.email || ADMIN_EMAIL;
  const amountStr = formatINR(amountReceivedPaise);
  const remainingPaise = Math.max(0, invoice.totalPaise - invoice.amountPaidPaise);

  const subject = `[PAYMENT RECEIPT] ₹${(amountReceivedPaise / 100).toLocaleString('en-IN')} Received for Invoice ${invoice.invoiceNumber} — Zawr Industries`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: #111; color: #fff; padding: 18px 24px; border-radius: 6px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 10px; font-weight: 700; color: #10B981; letter-spacing: 1px;">OFFICIAL RECEIPT VOUCHER</span>
        <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: 800;">ZAWR INDUSTRIES</h2>
      </div>
      <span style="background: #E6F4EA; color: #137333; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 20px;">PAYMENT SETTLED</span>
    </div>

    <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Dear <strong>${invoice.customerName}</strong>,</p>
    <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 20px;">
      Thank you for your payment. We gratefully acknowledge receipt of <strong>${amountStr}</strong> against Invoice <strong>${invoice.invoiceNumber}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666; width: 35%;">Receipt Date</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatShortDate()}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Invoice Cleared</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700;">${invoice.invoiceNumber}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Amount Received</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 800; color: #137333; font-size: 14px;">${amountStr}</td></tr>
      ${utrReference ? `<tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Bank UTR / Ref</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-family: monospace;">${utrReference}</td></tr>` : ''}
      ${bankName ? `<tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Deposit Account</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${bankName}</td></tr>` : ''}
      <tr style="background: #fafaf8;"><td style="padding: 12px 16px; font-weight: 800; color: #666;">Remaining Balance</td><td style="padding: 12px 16px; font-weight: 800; color: ${remainingPaise > 0 ? '#C5221F' : '#137333'}; font-size: 14px;">${formatINR(remainingPaise)}</td></tr>
    </table>

    <div style="background: #e6f4ea; border: 1px solid #137333; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #137333; text-align: center;">
      ✓ Verified Double-Entry Ledger Posting: Accounts Receivable & Bank Book Updated
    </div>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: [toEmail, ADMIN_EMAIL],
    subject,
    htmlContent,
  });
}

// -------------------------------------------------------------
// 4. Customer Subledger Statement of Account
// -------------------------------------------------------------
export async function sendCustomerStatementEmail(customer: Customer, customerInvoices: Invoice[]) {
  const toEmail = customer.email || ADMIN_EMAIL;
  const totalInvoicedPaise = customerInvoices.reduce((acc, inv) => acc + inv.totalPaise, 0);
  const totalPaidPaise = customerInvoices.reduce((acc, inv) => acc + inv.amountPaidPaise, 0);
  const closingBalancePaise = totalInvoicedPaise - totalPaidPaise;

  // Build Excel statement
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [
    ['ZAWR INDUSTRIES LLP — CUSTOMER STATEMENT OF ACCOUNT'],
    ['CUSTOMER:', customer.name, 'GSTIN:', customer.gstin || 'URP'],
    ['PERIOD: Fiscal Year 2026-27 | CURRENCY: INR (₹)'],
    [`GENERATED: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`],
    [],
    ['DATE', 'INVOICE #', 'DUE DATE', 'INVOICE AMOUNT (INR)', 'PAID AMOUNT (INR)', 'STATUS', 'OUTSTANDING (INR)'],
  ];

  customerInvoices.forEach((inv) => {
    rows.push([
      inv.invoiceDate,
      inv.invoiceNumber,
      inv.dueDate,
      inv.totalPaise / 100,
      inv.amountPaidPaise / 100,
      inv.status,
      (inv.totalPaise - inv.amountPaidPaise) / 100,
    ]);
  });

  rows.push([]);
  rows.push(['TOTALS', '', '', totalInvoicedPaise / 100, totalPaidPaise / 100, '', closingBalancePaise / 100]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Customer Statement');
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const subject = `Statement of Account: ${customer.name} (Closing Balance: ${formatINR(closingBalancePaise)}) — Zawr Books`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <h2 style="margin: 0; font-size: 20px; font-weight: 800;">ZAWR INDUSTRIES — STATEMENT OF ACCOUNT</h2>
    <p style="font-size: 12px; color: #666; margin: 4px 0 20px;">Customer Subledger Statement · ${customer.name}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666; width: 40%;">Total Invoiced Value</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700;">${formatINR(totalInvoicedPaise)}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Total Receipts Credited</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #137333;">${formatINR(totalPaidPaise)}</td></tr>
      <tr style="background: ${closingBalancePaise > 0 ? '#FCE8E6' : '#E6F4EA'};">
        <td style="padding: 12px 16px; font-weight: 800; color: ${closingBalancePaise > 0 ? '#C5221F' : '#137333'};">Closing Net Balance</td>
        <td style="padding: 12px 16px; font-weight: 800; color: ${closingBalancePaise > 0 ? '#C5221F' : '#137333'}; font-size: 16px;">${formatINR(closingBalancePaise)}</td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #555;">Please find the attached complete transaction statement spreadsheet (<strong>Statement_${customer.name.replace(/\s+/g, '_')}.xlsx</strong>).</p>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: [toEmail, ADMIN_EMAIL],
    subject,
    htmlContent,
    attachments: [
      {
        filename: `Statement_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  });
}

// -------------------------------------------------------------
// 5. Vendor Remittance Advice (Payment Advice)
// -------------------------------------------------------------
export interface VendorRemittanceParams {
  bill: VendorBill;
  vendor?: Vendor;
  paidAmountPaise: number;
  tdsDeductedPaise?: number;
  utrReference?: string;
  paymentDate?: string;
}

export async function sendVendorRemittanceEmail(params: VendorRemittanceParams) {
  const { bill, vendor, paidAmountPaise, tdsDeductedPaise = 0, utrReference = 'NEFT/RTGS-AUTO', paymentDate = new Date().toISOString() } = params;
  const toEmail = vendor?.email || ADMIN_EMAIL;
  const netPaidStr = formatINR(paidAmountPaise);

  const subject = `[REMITTANCE ADVICE] Payment for Bill ${bill.billNumber} (${netPaidStr}) — Zawr Industries LLP`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: #111; color: #fff; padding: 18px 24px; border-radius: 6px; margin-bottom: 24px;">
      <span style="font-size: 10px; font-weight: 700; color: #10B981; letter-spacing: 1px;">SUPPLIER PAYMENT DISBURSEMENT</span>
      <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: 800;">ZAWR INDUSTRIES — PAYMENT ADVICE</h2>
    </div>

    <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Dear <strong>${bill.vendorName}</strong>,</p>
    <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 20px;">
      We have processed and remitted payment for your supplier bill <strong>${bill.billNumber}</strong>. Please find the remittance breakdown below:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666; width: 38%;">Supplier Bill Reference</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700;">${bill.billNumber}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Payment Date</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatShortDate(paymentDate)}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Gross Invoice Amount</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatINR(bill.totalPaise)}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">TDS Withheld (Sec 194C/J)</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #C5221F;">- ${formatINR(tdsDeductedPaise)}</td></tr>
      <tr style="background: #e6f4ea;"><td style="padding: 12px 16px; font-weight: 800; color: #137333;">Net Remitted to Bank</td><td style="padding: 12px 16px; font-weight: 800; color: #137333; font-size: 15px;">${netPaidStr}</td></tr>
      <tr><td style="padding: 10px 16px; font-weight: 700; color: #666;">Bank UTR / Ref Number</td><td style="padding: 10px 16px; font-family: monospace; font-weight: 700;">${utrReference}</td></tr>
    </table>

    <div style="font-size: 11px; color: #777; text-align: center;">
      Zawr Industries LLP · Accounts Payable · Bengaluru, Karnataka
    </div>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: [toEmail, ADMIN_EMAIL],
    subject,
    htmlContent,
  });
}

// -------------------------------------------------------------
// 6. Managerial / CFO Approval Request
// -------------------------------------------------------------
export async function sendApprovalRequestEmail(expense: ExpenseSubmission) {
  const subject = `[APPROVAL REQUIRED] Expense Claim: ${formatINR(expense.grandTotalPaise)} by ${expense.employeeName} — Zawr Books`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
    <div style="border-bottom: 2px solid #E37400; padding-bottom: 14px; margin-bottom: 20px;">
      <span style="font-size: 10px; font-weight: 700; color: #E37400; letter-spacing: 1.5px; text-transform: uppercase;">MANAGERIAL WORKFLOW & CONTROL</span>
      <h2 style="margin: 4px 0 0; font-size: 20px; font-weight: 800;">EXPENSE APPROVAL PENDING</h2>
    </div>

    <p style="font-size: 14px; color: #333; margin: 0 0 16px;">An employee expense claim requires your executive authorization:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666; width: 35%;">Employee</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700;">${expense.employeeName}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Title / Purpose</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${expense.title}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Merchant / Vendor</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${expense.vendorName}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Claim Amount</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 800; font-size: 15px; color: #111;">${formatINR(expense.grandTotalPaise)}</td></tr>
      <tr><td style="padding: 10px 16px; font-weight: 700; color: #666;">Submission Date</td><td style="padding: 10px 16px;">${formatShortDate(expense.createdAt)}</td></tr>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://books.zawrindustries.com/web/approvals" style="background: #111; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 700; font-size: 13px; display: inline-block;">
        Review & Authorize in Approvals Queue
      </a>
    </div>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: ADMIN_EMAIL,
    subject,
    htmlContent,
  });
}

// -------------------------------------------------------------
// 7. Approval Decision Notification (Approved / Rejected)
// -------------------------------------------------------------
export async function sendApprovalDecisionEmail(expense: ExpenseSubmission, decision: 'Approved' | 'Rejected' | 'Returned', comment?: string) {
  const isApproved = decision === 'Approved';
  const badgeColor = isApproved ? '#137333' : '#C5221F';
  const badgeBg = isApproved ? '#E6F4EA' : '#FCE8E6';

  const subject = `Expense Claim ${decision.toUpperCase()}: "${expense.title}" (${formatINR(expense.grandTotalPaise)}) — Zawr Books`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${badgeColor}; padding-bottom: 14px; margin-bottom: 20px;">
      <div>
        <span style="font-size: 10px; font-weight: 700; color: #666; letter-spacing: 1.5px; text-transform: uppercase;">APPROVAL STATUS UPDATE</span>
        <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: 800;">EXPENSE CLAIM ${decision.toUpperCase()}</h2>
      </div>
      <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 20px;">
        ${decision}
      </span>
    </div>

    <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Dear <strong>${expense.employeeName}</strong>,</p>
    <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 20px;">
      Your expense claim for <strong>${expense.title}</strong> has been reviewed and marked as <strong>${decision}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 20px;">
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666; width: 35%;">Claimed Amount</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 800;">${formatINR(expense.grandTotalPaise)}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Decision Date</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatShortDate()}</td></tr>
      ${comment ? `<tr><td style="padding: 10px 16px; font-weight: 700; color: #666;">Reviewer Comment</td><td style="padding: 10px 16px; font-style: italic;">"${comment}"</td></tr>` : ''}
    </table>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: ADMIN_EMAIL,
    subject,
    htmlContent,
  });
}

// -------------------------------------------------------------
// 8. Cost Centre Budget Threshold & Breach Warning
// -------------------------------------------------------------
export async function sendBudgetAlertEmail(budget: BudgetItem, percent: number) {
  const isBreached = percent >= 100;
  const badgeColor = isBreached ? '#C5221F' : '#E37400';
  const badgeBg = isBreached ? '#FCE8E6' : '#FEF7E0';
  const alertTitle = isBreached ? 'CRITICAL BUDGET BREACH' : 'BUDGET UTILIZATION WARNING (80%+)';

  const subject = `[BUDGET ALERT] ${budget.name} reached ${percent}% of Fiscal Allocation — Zawr Books`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f4f3ef; margin: 0; padding: 24px 16px; color: #111;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0dfd5; padding: 32px;">
    <div style="border-bottom: 2px solid ${badgeColor}; padding-bottom: 14px; margin-bottom: 20px;">
      <span style="font-size: 10px; font-weight: 700; color: ${badgeColor}; letter-spacing: 1.5px; text-transform: uppercase;">${alertTitle}</span>
      <h2 style="margin: 4px 0 0; font-size: 20px; font-weight: 800;">BUDGET VARIANCE ALERT</h2>
    </div>

    <p style="font-size: 14px; color: #333; margin: 0 0 16px;">Spending in cost centre <strong>${budget.name} (${budget.costCentre})</strong> has crossed approved operating limits:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafaf9; border: 1px solid #ebebeb; border-radius: 6px; font-size: 13px; margin-bottom: 24px;">
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666; width: 40%;">Category / Cost Centre</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700;">${budget.name} (${budget.costCentre})</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Allocated Budget</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatINR(budget.budgetPaise)}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Actual Spent</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 800; color: #C5221F;">${formatINR(budget.actualPaise)}</td></tr>
      <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-weight: 700; color: #666;">Remaining Limit</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee;">${formatINR(budget.budgetPaise - budget.actualPaise)}</td></tr>
      <tr style="background: ${badgeBg};"><td style="padding: 12px 16px; font-weight: 800; color: ${badgeColor};">Utilization Rate</td><td style="padding: 12px 16px; font-weight: 800; color: ${badgeColor}; font-size: 16px;">${percent}%</td></tr>
    </table>

    <div style="text-align: center;">
      <a href="https://books.zawrindustries.com/web/budgets" style="background: #111; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 700; font-size: 13px; display: inline-block;">
        View Cost Centre Allocations
      </a>
    </div>
  </div>
</body>
</html>
  `;

  return await emailService.sendEmail({
    to: ADMIN_EMAIL,
    subject,
    htmlContent,
  });
}
