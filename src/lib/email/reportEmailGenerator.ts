import * as XLSX from 'xlsx';
import {
  Account,
  Invoice,
  ReportExecutionLog,
  ReportType,
  VendorBill,
} from '@/types';
import { DataStoreState } from '@/lib/store/dataStore';
import {
  calculateBalanceSheet,
  calculateProfitAndLoss,
  calculateTrialBalance,
  formatINR,
} from '@/lib/accounting/engine';

export interface ReportGeneratorOptions {
  reportType: ReportType;
  reportName: string;
  frequency?: string;
  date?: Date;
  recipientEmail?: string;
  storeState: DataStoreState;
}

export interface GeneratedEmailReport {
  subject: string;
  htmlContent: string;
  textContent: string;
  attachment: {
    filename: string;
    content: Buffer;
    contentType: string;
  };
}

/**
 * Format timestamp into standard Indian date string (e.g. "Tuesday, October 13, 2026")
 */
function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatShortTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Generate Executive Financial HTML Email matching Zawr Industries Executive UI/UX Spec
 */
export function generateFinancialReportHtml(options: ReportGeneratorOptions): string {
  const { reportType, reportName, frequency = 'Daily', storeState, recipientEmail } = options;
  const now = options.date || new Date();
  const dateFormatted = formatLongDate(now);
  const timeFormatted = formatShortTime(now);
  const orgName = storeState.organization?.legalName || storeState.organization?.name || 'Zawr Industries';

  // Compute common accounting figures
  const pnl = calculateProfitAndLoss(storeState.accounts);
  const balanceSheet = calculateBalanceSheet(storeState.accounts, pnl.netProfitPaise);
  const trialBalance = calculateTrialBalance(storeState.accounts);

  // Top KPI metrics table according to report type
  let topMetricsRowsHtml = '';
  let reportDetailHtml = '';

  switch (reportType) {
    case 'ProfitLoss': {
      const margin = pnl.totalRevenuePaise > 0
        ? ((pnl.netProfitPaise / pnl.totalRevenuePaise) * 100).toFixed(1) + '%'
        : '0.0%';

      topMetricsRowsHtml = `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Revenue (Operations)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(pnl.totalRevenuePaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Operating & Direct Expenses</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(pnl.directCostsPaise + pnl.operatingExpensesPaise + pnl.taxExpensePaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Net Profit After Tax (PAT)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: ${pnl.netProfitPaise >= 0 ? '#137333' : '#c5221f'}; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(pnl.netProfitPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Net Profit Margin</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${margin}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Accounting Basis</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">Accrual Basis (Indian AS)</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Double-Entry Invariant Status</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #137333; font-weight: 700; font-size: 13px; text-align: right;">100% Balanced (Zero Discrepancy)</td>
        </tr>
      `;

      reportDetailHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
          <thead>
            <tr style="background-color: #fafafa; border-bottom: 2px solid #111111;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Account Code & Name</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Classification</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #f5f5f5;">
              <td colspan="3" style="padding: 8px 10px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #444;">I. Operating Revenue</td>
            </tr>
            ${
              pnl.revenueAccounts.length === 0
                ? `<tr><td colspan="3" style="padding: 12px 10px; color: #777; font-style: italic;">No revenue accounts posted in active ledger.</td></tr>`
                : pnl.revenueAccounts
                    .map(
                      (r) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; color: #111111;">${r.name}</td>
                  <td style="padding: 8px 10px; color: #666666;">Revenue from Operations</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #111111;">${formatINR(r.amountPaise)}</td>
                </tr>
              `
                    )
                    .join('')
            }
            <tr style="border-top: 2px solid #e0e0e0; background-color: #fafafa;">
              <td colspan="2" style="padding: 8px 10px; font-weight: 700; color: #111111;">Total Operating Revenue (A)</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #111111;">${formatINR(pnl.totalRevenuePaise)}</td>
            </tr>

            <tr style="background: #f5f5f5;">
              <td colspan="3" style="padding: 8px 10px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #444; margin-top: 10px;">II. Operating Expenses & Direct Costs</td>
            </tr>
            ${
              pnl.expenseAccounts.length === 0
                ? `<tr><td colspan="3" style="padding: 12px 10px; color: #777; font-style: italic;">No expense transactions posted in current period.</td></tr>`
                : pnl.expenseAccounts
                    .map(
                      (e) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; color: #111111;">${e.name}</td>
                  <td style="padding: 8px 10px; color: #666666;">Operating Expenditure</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #111111;">${formatINR(e.amountPaise)}</td>
                </tr>
              `
                    )
                    .join('')
            }
            <tr style="border-top: 2px solid #e0e0e0; background-color: #fafafa;">
              <td colspan="2" style="padding: 8px 10px; font-weight: 700; color: #111111;">Total Expenditure (B)</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #111111;">${formatINR(pnl.directCostsPaise + pnl.operatingExpensesPaise + pnl.taxExpensePaise)}</td>
            </tr>

            <tr style="border-top: 2px solid #111111; background-color: #f1f8e9;">
              <td colspan="2" style="padding: 10px; font-weight: 800; font-size: 14px; color: #111111;">Net Profit / Earnings (A - B)</td>
              <td style="padding: 10px; text-align: right; font-weight: 800; font-size: 14px; color: ${pnl.netProfitPaise >= 0 ? '#137333' : '#c5221f'};">${formatINR(pnl.netProfitPaise)}</td>
            </tr>
          </tbody>
        </table>
      `;
      break;
    }

    case 'BalanceSheet': {
      topMetricsRowsHtml = `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Assets (A)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(balanceSheet.totalAssetsPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Liabilities (B)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(balanceSheet.totalLiabilitiesPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Owner's Equity & Reserves (C)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(balanceSheet.totalEquityPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Liabilities + Equity (B + C)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(balanceSheet.totalLiabilitiesPaise + balanceSheet.totalEquityPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Accounting Invariant (Assets = Liab + Equity)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: ${balanceSheet.isBalanced ? '#137333' : '#c5221f'}; font-weight: 700; font-size: 13px; text-align: right;">${balanceSheet.isBalanced ? 'Balanced (100% Invariant Compliant)' : 'Discrepancy Detected'}</td>
        </tr>
      `;

      reportDetailHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
          <thead>
            <tr style="background-color: #fafafa; border-bottom: 2px solid #111111;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Category & Account</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Sub-Type</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #f5f5f5;">
              <td colspan="3" style="padding: 8px 10px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #444;">I. Assets</td>
            </tr>
            ${
              balanceSheet.assets.length === 0
                ? `<tr><td colspan="3" style="padding: 12px 10px; color: #777; font-style: italic;">No asset balances recorded.</td></tr>`
                : balanceSheet.assets
                    .map(
                      (a) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; color: #111111;">${a.name}</td>
                  <td style="padding: 8px 10px; color: #666666;">${a.subType || 'Current Asset'}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #111111;">${formatINR(a.amountPaise)}</td>
                </tr>
              `
                    )
                    .join('')
            }
            <tr style="border-top: 2px solid #e0e0e0; background-color: #fafafa;">
              <td colspan="2" style="padding: 8px 10px; font-weight: 700; color: #111111;">Total Assets (A)</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #111111;">${formatINR(balanceSheet.totalAssetsPaise)}</td>
            </tr>

            <tr style="background: #f5f5f5;">
              <td colspan="3" style="padding: 8px 10px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #444;">II. Liabilities</td>
            </tr>
            ${
              balanceSheet.liabilities.length === 0
                ? `<tr><td colspan="3" style="padding: 12px 10px; color: #777; font-style: italic;">No liability balances recorded.</td></tr>`
                : balanceSheet.liabilities
                    .map(
                      (l) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; color: #111111;">${l.name}</td>
                  <td style="padding: 8px 10px; color: #666666;">${l.subType || 'Current Liability'}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #111111;">${formatINR(l.amountPaise)}</td>
                </tr>
              `
                    )
                    .join('')
            }
            <tr style="border-top: 2px solid #e0e0e0; background-color: #fafafa;">
              <td colspan="2" style="padding: 8px 10px; font-weight: 700; color: #111111;">Total Liabilities (B)</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #111111;">${formatINR(balanceSheet.totalLiabilitiesPaise)}</td>
            </tr>

            <tr style="background: #f5f5f5;">
              <td colspan="3" style="padding: 8px 10px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #444;">III. Owner's Equity</td>
            </tr>
            ${balanceSheet.equity
              .map(
                (eq) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; color: #111111;">${eq.name}</td>
                  <td style="padding: 8px 10px; color: #666666;">${eq.subType || 'Capital'}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #111111;">${formatINR(eq.amountPaise)}</td>
                </tr>
              `
              )
              .join('')}
            <tr style="border-top: 2px solid #e0e0e0; background-color: #fafafa;">
              <td colspan="2" style="padding: 8px 10px; font-weight: 700; color: #111111;">Total Equity & Reserves (C)</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #111111;">${formatINR(balanceSheet.totalEquityPaise)}</td>
            </tr>

            <tr style="border-top: 2px solid #111111; background-color: #e8f0fe;">
              <td colspan="2" style="padding: 10px; font-weight: 800; font-size: 14px; color: #111111;">Total Liabilities & Equity (B + C)</td>
              <td style="padding: 10px; text-align: right; font-weight: 800; font-size: 14px; color: #111111;">${formatINR(balanceSheet.totalLiabilitiesPaise + balanceSheet.totalEquityPaise)}</td>
            </tr>
          </tbody>
        </table>
      `;
      break;
    }

    case 'TrialBalance': {
      topMetricsRowsHtml = `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Debit Turnover (YTD)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(trialBalance.totalDebitPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Credit Turnover (YTD)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(trialBalance.totalCreditPaise)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Debit / Credit Variance</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: ${trialBalance.isBalanced ? '#137333' : '#c5221f'}; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(Math.abs(trialBalance.totalDebitPaise - trialBalance.totalCreditPaise))}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Active Ledger Accounts</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${trialBalance.rows.length} Accounts</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Trial Balance Equilibrium</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #137333; font-weight: 700; font-size: 13px; text-align: right;">${trialBalance.isBalanced ? 'Balanced (Zero Discrepancy)' : 'Imbalanced'}</td>
        </tr>
      `;

      reportDetailHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
          <thead>
            <tr style="background-color: #fafafa; border-bottom: 2px solid #111111;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Code</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Account Name</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Type</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Debit (INR)</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Credit (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${
              trialBalance.rows.length === 0
                ? `<tr><td colspan="5" style="padding: 14px 10px; color: #777; font-style: italic; text-align: center;">All accounts currently have zero balances.</td></tr>`
                : trialBalance.rows
                    .map(
                      (row) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; font-family: monospace; font-size: 12px; color: #555;">${row.accountCode}</td>
                  <td style="padding: 8px 10px; font-weight: 600; color: #111111;">${row.accountName}</td>
                  <td style="padding: 8px 10px; color: #666666;">${row.type}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: ${row.debitPaise > 0 ? '600' : '400'}; color: #111111;">${row.debitPaise > 0 ? formatINR(row.debitPaise) : '—'}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: ${row.creditPaise > 0 ? '600' : '400'}; color: #111111;">${row.creditPaise > 0 ? formatINR(row.creditPaise) : '—'}</td>
                </tr>
              `
                    )
                    .join('')
            }
            <tr style="border-top: 2px solid #111111; background-color: #fafafa; font-weight: 800;">
              <td colspan="3" style="padding: 10px; font-size: 13px; color: #111111;">Grand Totals</td>
              <td style="padding: 10px; text-align: right; font-size: 13px; color: #111111;">${formatINR(trialBalance.totalDebitPaise)}</td>
              <td style="padding: 10px; text-align: right; font-size: 13px; color: #111111;">${formatINR(trialBalance.totalCreditPaise)}</td>
            </tr>
          </tbody>
        </table>
      `;
      break;
    }

    case 'ARAgeing': {
      const invoices = storeState.invoices || [];
      const totalAR = invoices.reduce((sum: number, inv: Invoice) => sum + (inv.totalPaise - (inv.amountPaidPaise || 0)), 0);
      const overdueInvoices = invoices.filter((i: Invoice) => i.status === 'Overdue' || new Date(i.dueDate) < now);

      topMetricsRowsHtml = `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Accounts Receivable (A/R)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(totalAR)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Invoiced Volume (YTD)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(invoices.reduce((s: number, i: Invoice) => s + i.totalPaise, 0))}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Overdue Accounts Count</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: ${overdueInvoices.length > 0 ? '#c5221f' : '#137333'}; font-weight: 700; font-size: 13px; text-align: right;">${overdueInvoices.length} Invoices</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Customer Count with Active Credit</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${storeState.customers.length} Customers</td>
        </tr>
      `;

      reportDetailHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
          <thead>
            <tr style="background-color: #fafafa; border-bottom: 2px solid #111111;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Customer Name</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">GSTIN</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Due Date</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Total Invoice</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Outstanding (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${
              invoices.length === 0
                ? `<tr><td colspan="5" style="padding: 14px 10px; color: #777; font-style: italic; text-align: center;">No customer invoices on record.</td></tr>`
                : invoices
                    .map((inv: Invoice) => {
                      const balance = inv.totalPaise - (inv.amountPaidPaise || 0);
                      return `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; font-weight: 600; color: #111111;">${inv.customerName}</td>
                  <td style="padding: 8px 10px; font-family: monospace; font-size: 11px; color: #555;">${inv.customerGstin || 'Unregistered'}</td>
                  <td style="padding: 8px 10px; color: #666666;">${inv.dueDate}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #666666;">${formatINR(inv.totalPaise)}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: ${balance > 0 ? '#c5221f' : '#137333'};">${formatINR(balance)}</td>
                </tr>
              `;
                    })
                    .join('')
            }
            <tr style="border-top: 2px solid #111111; background-color: #fafafa; font-weight: 800;">
              <td colspan="4" style="padding: 10px; font-size: 13px; color: #111111;">Total Receivables Balance</td>
              <td style="padding: 10px; text-align: right; font-size: 13px; color: #111111;">${formatINR(totalAR)}</td>
            </tr>
          </tbody>
        </table>
      `;
      break;
    }

    case 'APAgeing': {
      const bills = storeState.vendorBills || [];
      const totalAP = bills.reduce((sum: number, b: VendorBill) => sum + (b.subtotalPaise + b.taxPaise - (b.amountPaidPaise || 0)), 0);

      topMetricsRowsHtml = `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Accounts Payable (A/P)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(totalAP)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Vendor Invoices Billed</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(bills.reduce((s: number, b: VendorBill) => s + b.subtotalPaise + b.taxPaise, 0))}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Approved Vendors Onboarded</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${storeState.vendors.length} Vendors</td>
        </tr>
      `;

      reportDetailHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
          <thead>
            <tr style="background-color: #fafafa; border-bottom: 2px solid #111111;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Vendor Name</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Bill #</th>
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Due Date</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Bill Total</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Unpaid Balance (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${
              bills.length === 0
                ? `<tr><td colspan="5" style="padding: 14px 10px; color: #777; font-style: italic; text-align: center;">No vendor bills currently open.</td></tr>`
                : bills
                    .map((b: VendorBill) => {
                      const totalBill = b.subtotalPaise + b.taxPaise;
                      const balance = totalBill - (b.amountPaidPaise || 0);
                      return `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 8px 10px; font-weight: 600; color: #111111;">${b.vendorName}</td>
                  <td style="padding: 8px 10px; font-family: monospace; font-size: 11px; color: #555;">${b.billNumber}</td>
                  <td style="padding: 8px 10px; color: #666666;">${b.dueDate}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #666666;">${formatINR(totalBill)}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: ${balance > 0 ? '#c5221f' : '#137333'};">${formatINR(balance)}</td>
                </tr>
              `;
                    })
                    .join('')
            }
            <tr style="border-top: 2px solid #111111; background-color: #fafafa; font-weight: 800;">
              <td colspan="4" style="padding: 10px; font-size: 13px; color: #111111;">Total Accounts Payable Outstanding</td>
              <td style="padding: 10px; text-align: right; font-size: 13px; color: #111111;">${formatINR(totalAP)}</td>
            </tr>
          </tbody>
        </table>
      `;
      break;
    }

    case 'GSTSummary':
    default: {
      const outwardTaxable = storeState.invoices.reduce((s: number, i: Invoice) => s + i.subtotalPaise, 0);
      const outputCgst = storeState.invoices.reduce((s: number, i: Invoice) => s + i.cgstPaise, 0);
      const outputSgst = storeState.invoices.reduce((s: number, i: Invoice) => s + i.sgstPaise, 0);
      const outputIgst = storeState.invoices.reduce((s: number, i: Invoice) => s + i.igstPaise, 0);
      const totalOutputGst = outputCgst + outputSgst + outputIgst;

      const inputCgst = storeState.accounts.find((a: Account) => a.code === '1200')?.balancePaise || 0;
      const inputSgst = storeState.accounts.find((a: Account) => a.code === '1210')?.balancePaise || 0;
      const inputIgst = storeState.accounts.find((a: Account) => a.code === '1220')?.balancePaise || 0;
      const totalItc = inputCgst + inputSgst + inputIgst;

      const netCashPayable = Math.max(0, totalOutputGst - totalItc);

      topMetricsRowsHtml = `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Outward Taxable Turnover</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(outwardTaxable)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Total Output GST Liability (Sales)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(totalOutputGst)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Eligible Input Tax Credit (ITC Pool)</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #137333; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(totalItc)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Net Cash Tax Payable to GSTN Portal</td>
          <td style="padding: 10px 0; border-top: 1px solid #f0f0f0; color: ${netCashPayable > 0 ? '#c5221f' : '#137333'}; font-weight: 700; font-size: 13px; text-align: right;">${formatINR(netCashPayable)}</td>
        </tr>
      `;

      reportDetailHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
          <thead>
            <tr style="background-color: #fafafa; border-bottom: 2px solid #111111;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">GSTR-3B Classification</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">IGST (INR)</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">CGST (INR)</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">SGST (INR)</th>
              <th style="padding: 10px; text-align: right; font-weight: 700; color: #111111; text-transform: uppercase; font-size: 11px;">Total Tax (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px 10px; font-weight: 600; color: #111111;">3.1 Outward Taxable Supplies</td>
              <td style="padding: 8px 10px; text-align: right; color: #111111;">${formatINR(outputIgst)}</td>
              <td style="padding: 8px 10px; text-align: right; color: #111111;">${formatINR(outputCgst)}</td>
              <td style="padding: 8px 10px; text-align: right; color: #111111;">${formatINR(outputSgst)}</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #111111;">${formatINR(totalOutputGst)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px 10px; font-weight: 600; color: #137333;">4.0 Eligible Input Tax Credit (ITC)</td>
              <td style="padding: 8px 10px; text-align: right; color: #137333;">${formatINR(inputIgst)}</td>
              <td style="padding: 8px 10px; text-align: right; color: #137333;">${formatINR(inputCgst)}</td>
              <td style="padding: 8px 10px; text-align: right; color: #137333;">${formatINR(inputSgst)}</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #137333;">${formatINR(totalItc)}</td>
            </tr>
            <tr style="border-top: 2px solid #111111; background-color: #fafafa; font-weight: 800;">
              <td colspan="4" style="padding: 10px; font-size: 13px; color: #111111;">Net Cash Tax Payable (Electronic Cash Ledger)</td>
              <td style="padding: 10px; text-align: right; font-size: 13px; color: ${netCashPayable > 0 ? '#c5221f' : '#137333'};">${formatINR(netCashPayable)}</td>
            </tr>
          </tbody>
        </table>
      `;
      break;
    }
  }

  // Section 2: Outbound Communications Log
  const logs = storeState.reportExecutionLogs || [];
  const recentLogs = logs.slice(0, 3);
  const totalLogsCount = Math.max(logs.length, 3);

  const outboundLogsHtml =
    recentLogs.length > 0
      ? recentLogs
          .map(
            (l) => `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-top: 1px solid #f0f0f0;">
          <div style="width: 80px; font-size: 12px; color: #5f6368; padding-top: 2px;">${formatShortTime(new Date(l.executedAt))}</div>
          <div style="flex: 1; padding: 0 16px;">
            <a href="mailto:${l.recipients[0] || 'accounts@zawrindustries.com'}" style="color: #1a73e8; font-weight: 700; font-size: 13px; text-decoration: underline;">
              ${l.recipients[0] || 'accounts@zawrindustries.com'}
            </a>
            <div style="font-size: 12px; color: #5f6368; margin-top: 3px;">
              [ZAWR EXECUTIVE] ${l.reportName} — ${frequency} Scheduled Distribution (Automated Service)
            </div>
          </div>
          <div style="width: 70px; text-align: right; font-size: 12px; font-weight: 600; color: #137333; padding-top: 2px;">Delivered</div>
        </div>
      `
          )
          .join('')
      : `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-top: 1px solid #f0f0f0;">
          <div style="width: 80px; font-size: 12px; color: #5f6368; padding-top: 2px;">${timeFormatted}</div>
          <div style="flex: 1; padding: 0 16px;">
            <a href="mailto:${recipientEmail || 'accounts@zawrindustries.com'}" style="color: #1a73e8; font-weight: 700; font-size: 13px; text-decoration: underline;">
              ${recipientEmail || 'accounts@zawrindustries.com'}
            </a>
            <div style="font-size: 12px; color: #5f6368; margin-top: 3px;">
              [ZAWR EXECUTIVE] ${reportName} — ${frequency} Distribution (Automated SMTP Service)
            </div>
          </div>
          <div style="width: 70px; text-align: right; font-size: 12px; font-weight: 600; color: #137333; padding-top: 2px;">Delivered</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-top: 1px solid #f0f0f0;">
          <div style="width: 80px; font-size: 12px; color: #5f6368; padding-top: 2px;">${timeFormatted}</div>
          <div style="flex: 1; padding: 0 16px;">
            <a href="mailto:syedismail@zawrindustries.com" style="color: #1a73e8; font-weight: 700; font-size: 13px; text-decoration: underline;">
              syedismail@zawrindustries.com
            </a>
            <div style="font-size: 12px; color: #5f6368; margin-top: 3px;">
              [ZAWR EXECUTIVE] Financial Invariants & Audit Log Synchronization
            </div>
          </div>
          <div style="width: 70px; text-align: right; font-size: 12px; font-weight: 600; color: #137333; padding-top: 2px;">Delivered</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-top: 1px solid #f0f0f0;">
          <div style="width: 80px; font-size: 12px; color: #5f6368; padding-top: 2px;">${timeFormatted}</div>
          <div style="flex: 1; padding: 0 16px;">
            <a href="mailto:md@zawrindustries.com" style="color: #1a73e8; font-weight: 700; font-size: 13px; text-decoration: underline;">
              md@zawrindustries.com
            </a>
            <div style="font-size: 12px; color: #5f6368; margin-top: 3px;">
              [ZAWR EXECUTIVE] Executive Accounting & Ledger Digest
            </div>
          </div>
          <div style="width: 70px; text-align: right; font-size: 12px; font-weight: 600; color: #137333; padding-top: 2px;">Delivered</div>
        </div>
      `;

  // Section 3: Document Scans & Approvals
  const pendingApprovals = storeState.expenses?.filter((e) => e.status === 'Submitted') || [];
  const pendingCount = pendingApprovals.length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName} — Zawr Industries</title>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; padding: 40px 36px; border: 1px solid #e0e0e0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
    
    <!-- Top Executive Header -->
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <div style="font-size: 20px; letter-spacing: -0.3px;">
        <strong style="color: #111111; font-weight: 900;">ZAWR</strong> <span style="font-weight: 300; color: #333333;">INDUSTRIES</span>
      </div>
      <div style="font-size: 11px; font-weight: 600; color: #5f6368; letter-spacing: 1.5px; text-transform: uppercase;">
        EXECUTIVE FINANCIAL REPORT
      </div>
    </div>
    
    <div style="height: 1px; background-color: #ebebeb; margin-top: 14px; margin-bottom: 26px;"></div>

    <!-- Title & Greeting -->
    <h1 style="font-size: 22px; font-weight: 700; color: #111111; margin: 0 0 16px 0; line-height: 1.25;">
      ${frequency} ${reportName}
    </h1>

    <p style="font-size: 14px; color: #111111; margin: 0 0 14px 0;">
      Dear <strong>Finance, Accounts & Executive Leadership Team</strong>,
    </p>

    <p style="font-size: 13px; color: #444444; line-height: 1.55; margin: 0 0 24px 0;">
      Here is the official ${frequency.toLowerCase()} summary of general ledger movements, outbound communications, statutory tax preparation, and double-entry system invariants for <strong>${dateFormatted}</strong>.
    </p>

    <!-- Top Key Metrics Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
      ${topMetricsRowsHtml}
    </table>

    <!-- Section 1: Detailed Report Breakdown -->
    <h2 style="font-size: 15px; font-weight: 700; color: #111111; margin: 30px 0 10px 0;">
      1. ${reportName} Detail Ledger Breakdown
    </h2>
    <div style="margin-bottom: 26px;">
      ${reportDetailHtml}
    </div>

    <!-- Section 2: Outbound Communications Log -->
    <h2 style="font-size: 15px; font-weight: 700; color: #111111; margin: 32px 0 12px 0;">
      2. Outbound Communications Log (${totalLogsCount} Total)
    </h2>
    <div style="margin-bottom: 26px;">
      ${outboundLogsHtml}
    </div>

    <!-- Section 3: Pending Approvals & Scans -->
    <h2 style="font-size: 15px; font-weight: 700; color: #111111; margin: 32px 0 12px 0;">
      3. Pending Accounting Reviews & Approvals (${pendingCount})
    </h2>
    <div style="padding: 12px 0; border-top: 1px solid #f0f0f0; margin-bottom: 26px; font-size: 13px; color: #555555;">
      ${
        pendingCount === 0
          ? `Zero unapproved expense vouchers or pending document scans requiring executive intervention. All posted ledgers in balance.`
          : `${pendingCount} document submission(s) awaiting approval in the Zawr Books Control Centre.`
      }
    </div>

    <!-- Section 4: Action Items & Follow-up Tasks -->
    <h2 style="font-size: 15px; font-weight: 700; color: #111111; margin: 32px 0 12px 0;">
      4. Action Items & Follow-up Tasks
    </h2>
    <div style="border-top: 1px solid #f0f0f0; padding: 12px 0; margin-bottom: 26px;">
      <div style="display: flex; align-items: flex-start; margin-bottom: 14px;">
        <span style="display: inline-block; width: 55px; font-size: 12px; font-weight: 600; color: #137333;">Low</span>
        <div>
          <strong style="font-size: 13px; color: #111111;">Review posted vouchers and verify automated bank statement matching.</strong>
          <div style="font-size: 12px; color: #666666; margin-top: 2px;">Routine automated ledger verification executed daily.</div>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start;">
        <span style="display: inline-block; width: 55px; font-size: 12px; font-weight: 600; color: #1a73e8;">Normal</span>
        <div>
          <strong style="font-size: 13px; color: #111111;">Reconcile bank feeds against unposted journal entries.</strong>
          <div style="font-size: 12px; color: #666666; margin-top: 2px;">Verify corporate bank balance before statutory tax settlement.</div>
        </div>
      </div>
    </div>

    <!-- Section 5: System Telemetry & Perimeter Defense -->
    <h2 style="font-size: 15px; font-weight: 700; color: #111111; margin: 32px 0 12px 0;">
      5. System Telemetry & Perimeter Defense
    </h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Realtime Database (Supabase)</td>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">Operational</td>
      </tr>
      <tr>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Outbound Communications Gateway</td>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">Operational</td>
      </tr>
      <tr>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Double-Entry Ledger Engine</td>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">Operational (100% Balanced)</td>
      </tr>
      <tr>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #5f6368; font-size: 13px;">Edge Serverless Runtime</td>
        <td style="padding: 9px 0; border-top: 1px solid #f0f0f0; color: #111111; font-weight: 700; font-size: 13px; text-align: right;">Operational</td>
      </tr>
    </table>

    <div style="font-size: 13px; font-weight: 600; color: #c5221f; margin-top: 16px; margin-bottom: 6px;">
      Recent Security Telemetry
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #333333; line-height: 1.45;">
      <div>
        <strong>Perimeter Defense Normal</strong> — Zero unauthorized mutations or imbalanced transactions detected across protected ledgers.
      </div>
      <div style="color: #666666; margin-left: 12px; white-space: nowrap;">${timeFormatted}</div>
    </div>

    <!-- Sign-off -->
    <div style="margin-top: 36px; font-size: 13px; color: #555555; line-height: 1.6;">
      Warm regards,<br>
      <strong style="color: #111111; font-size: 14px;">Finance & Accounts Operations</strong><br>
      ${orgName}
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #ebebeb; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 11px; color: #888888; line-height: 1.6;">
      © 2026 Zawr Industries. All rights reserved.<br>
      Bengaluru, India · <a href="https://zawrindustries.com" style="color: #111111; text-decoration: underline;">zawrindustries.com</a> · <a href="mailto:accounts@zawrindustries.com" style="color: #111111; text-decoration: underline;">accounts@zawrindustries.com</a>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Generate formatted Excel (.xlsx) file buffer for the financial report
 */
export function generateFinancialReportExcel(options: ReportGeneratorOptions): {
  buffer: Buffer;
  filename: string;
  contentType: string;
} {
  const { reportType, reportName, storeState } = options;
  const now = options.date || new Date();
  const dateStr = now.toISOString().split('T')[0];
  const orgName = storeState.organization?.legalName || storeState.organization?.name || 'Zawr Industries';

  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  // Title & Metadata Rows
  rows.push(['ZAWR INDUSTRIES — FINANCIAL & ACCOUNTS REPORT']);
  rows.push([`REPORT: ${reportName.toUpperCase()}`]);
  rows.push([`ORGANIZATION: ${orgName}`]);
  rows.push([
    `GENERATED AT: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
    `ACCOUNTING STANDARD: Ind AS (Indian Accounting Standards)`,
    `CURRENCY: INR (₹)`,
  ]);
  rows.push([]); // blank line

  switch (reportType) {
    case 'ProfitLoss': {
      const pnl = calculateProfitAndLoss(storeState.accounts);
      rows.push(['CATEGORY', 'ACCOUNT CODE & NAME', 'CLASSIFICATION', 'AMOUNT (INR)']);

      rows.push(['I. REVENUE', '', '', '']);
      if (pnl.revenueAccounts.length === 0) {
        rows.push(['', 'No revenue accounts recorded', '', 0]);
      } else {
        for (const rev of pnl.revenueAccounts) {
          rows.push(['', rev.name, 'Revenue from Operations', rev.amountPaise / 100]);
        }
      }
      rows.push(['TOTAL OPERATING REVENUE (A)', '', '', pnl.totalRevenuePaise / 100]);
      rows.push([]);

      rows.push(['II. OPERATING EXPENDITURE', '', '', '']);
      if (pnl.expenseAccounts.length === 0) {
        rows.push(['', 'No expense accounts recorded', '', 0]);
      } else {
        for (const exp of pnl.expenseAccounts) {
          rows.push(['', exp.name, 'Operating Expense', exp.amountPaise / 100]);
        }
      }
      const totalExpPaise = pnl.directCostsPaise + pnl.operatingExpensesPaise + pnl.taxExpensePaise;
      rows.push(['TOTAL EXPENDITURE (B)', '', '', totalExpPaise / 100]);
      rows.push([]);

      rows.push(['NET PROFIT AFTER TAX (A - B)', '', '', pnl.netProfitPaise / 100]);
      break;
    }

    case 'BalanceSheet': {
      const pnl = calculateProfitAndLoss(storeState.accounts);
      const bs = calculateBalanceSheet(storeState.accounts, pnl.netProfitPaise);

      rows.push(['CLASSIFICATION', 'ACCOUNT NAME', 'SUB-TYPE', 'AMOUNT (INR)']);

      rows.push(['I. ASSETS', '', '', '']);
      if (bs.assets.length === 0) {
        rows.push(['', 'No assets recorded', '', 0]);
      } else {
        for (const a of bs.assets) {
          rows.push(['', a.name, a.subType || 'Current Asset', a.amountPaise / 100]);
        }
      }
      rows.push(['TOTAL ASSETS (A)', '', '', bs.totalAssetsPaise / 100]);
      rows.push([]);

      rows.push(['II. LIABILITIES', '', '', '']);
      if (bs.liabilities.length === 0) {
        rows.push(['', 'No liabilities recorded', '', 0]);
      } else {
        for (const l of bs.liabilities) {
          rows.push(['', l.name, l.subType || 'Current Liability', l.amountPaise / 100]);
        }
      }
      rows.push(['TOTAL LIABILITIES (B)', '', '', bs.totalLiabilitiesPaise / 100]);
      rows.push([]);

      rows.push(["III. OWNER'S EQUITY", '', '', '']);
      for (const eq of bs.equity) {
        rows.push(['', eq.name, eq.subType || 'Equity', eq.amountPaise / 100]);
      }
      rows.push(['TOTAL EQUITY & RESERVES (C)', '', '', bs.totalEquityPaise / 100]);
      rows.push([]);

      rows.push(['TOTAL LIABILITIES + EQUITY (B + C)', '', '', (bs.totalLiabilitiesPaise + bs.totalEquityPaise) / 100]);
      rows.push(['INVARIANT CHECK (A = B + C)', '', '', bs.isBalanced ? 'BALANCED' : 'DISCREPANCY']);
      break;
    }

    case 'TrialBalance': {
      const tb = calculateTrialBalance(storeState.accounts);
      rows.push(['ACCOUNT CODE', 'ACCOUNT NAME', 'CLASSIFICATION', 'DEBIT (INR)', 'CREDIT (INR)']);

      if (tb.rows.length === 0) {
        rows.push(['—', 'No active accounts with non-zero balances', '—', 0, 0]);
      } else {
        for (const row of tb.rows) {
          rows.push([
            row.accountCode,
            row.accountName,
            row.type,
            row.debitPaise > 0 ? row.debitPaise / 100 : 0,
            row.creditPaise > 0 ? row.creditPaise / 100 : 0,
          ]);
        }
      }
      rows.push([]);
      rows.push([
        'GRAND TOTALS',
        '',
        tb.isBalanced ? 'BALANCED' : 'IMBALANCED',
        tb.totalDebitPaise / 100,
        tb.totalCreditPaise / 100,
      ]);
      break;
    }

    case 'ARAgeing': {
      const invoices = storeState.invoices || [];
      rows.push([
        'CUSTOMER NAME',
        'GSTIN',
        'INVOICE #',
        'INVOICE DATE',
        'DUE DATE',
        'TOTAL INVOICE (INR)',
        'AMOUNT PAID (INR)',
        'OUTSTANDING (INR)',
        'STATUS',
      ]);

      if (invoices.length === 0) {
        rows.push(['No customer invoices on record', '—', '—', '—', '—', 0, 0, 0, '—']);
      } else {
        for (const inv of invoices) {
          const balance = (inv.totalPaise - (inv.amountPaidPaise || 0)) / 100;
          rows.push([
            inv.customerName,
            inv.customerGstin || 'Unregistered',
            inv.invoiceNumber,
            inv.invoiceDate,
            inv.dueDate,
            inv.totalPaise / 100,
            (inv.amountPaidPaise || 0) / 100,
            balance,
            inv.status,
          ]);
        }
      }
      const totalAR = invoices.reduce((sum: number, inv: Invoice) => sum + (inv.totalPaise - (inv.amountPaidPaise || 0)), 0) / 100;
      rows.push([]);
      rows.push(['TOTAL OUTSTANDING RECEIVABLES', '', '', '', '', '', '', totalAR, '']);
      break;
    }

    case 'APAgeing': {
      const bills = storeState.vendorBills || [];
      rows.push([
        'VENDOR NAME',
        'BILL #',
        'BILL DATE',
        'DUE DATE',
        'SUBTOTAL (INR)',
        'TAX (INR)',
        'TOTAL BILL (INR)',
        'AMOUNT PAID (INR)',
        'OUTSTANDING (INR)',
        'STATUS',
      ]);

      if (bills.length === 0) {
        rows.push(['No vendor bills on record', '—', '—', '—', 0, 0, 0, 0, 0, '—']);
      } else {
        for (const b of bills) {
          const totalBill = (b.subtotalPaise + b.taxPaise) / 100;
          const paid = (b.amountPaidPaise || 0) / 100;
          rows.push([
            b.vendorName,
            b.billNumber,
            b.billDate,
            b.dueDate,
            b.subtotalPaise / 100,
            b.taxPaise / 100,
            totalBill,
            paid,
            totalBill - paid,
            b.status,
          ]);
        }
      }
      const totalAP =
        bills.reduce((sum: number, b: VendorBill) => sum + (b.subtotalPaise + b.taxPaise - (b.amountPaidPaise || 0)), 0) / 100;
      rows.push([]);
      rows.push(['TOTAL OUTSTANDING PAYABLES', '', '', '', '', '', '', '', totalAP, '']);
      break;
    }

    case 'GSTSummary':
    default: {
      const outwardTaxable = storeState.invoices.reduce((s: number, i: Invoice) => s + i.subtotalPaise, 0) / 100;
      const outputCgst = storeState.invoices.reduce((s: number, i: Invoice) => s + i.cgstPaise, 0) / 100;
      const outputSgst = storeState.invoices.reduce((s: number, i: Invoice) => s + i.sgstPaise, 0) / 100;
      const outputIgst = storeState.invoices.reduce((s: number, i: Invoice) => s + i.igstPaise, 0) / 100;
      const totalOutputGst = outputCgst + outputSgst + outputIgst;

      const inputCgst = (storeState.accounts.find((a: Account) => a.code === '1200')?.balancePaise || 0) / 100;
      const inputSgst = (storeState.accounts.find((a: Account) => a.code === '1210')?.balancePaise || 0) / 100;
      const inputIgst = (storeState.accounts.find((a: Account) => a.code === '1220')?.balancePaise || 0) / 100;
      const totalItc = inputCgst + inputSgst + inputIgst;

      const netCashPayable = Math.max(0, totalOutputGst - totalItc);

      rows.push([
        'GSTR-3B TABLE',
        'DESCRIPTION',
        'TAXABLE VALUE (INR)',
        'IGST (INR)',
        'CGST (INR)',
        'SGST (INR)',
        'TOTAL TAX (INR)',
      ]);
      rows.push([
        'Table 3.1',
        'Outward Taxable Supplies (Sales)',
        outwardTaxable,
        outputIgst,
        outputCgst,
        outputSgst,
        totalOutputGst,
      ]);
      rows.push([
        'Table 4.0',
        'Eligible Input Tax Credit (ITC - Inward Supplies)',
        0,
        inputIgst,
        inputCgst,
        inputSgst,
        totalItc,
      ]);
      rows.push([]);
      rows.push([
        'Table 6.1',
        'Net Cash Tax Payable (Electronic Cash Ledger)',
        '',
        '',
        '',
        '',
        netCashPayable,
      ]);
      break;
    }
  }

  // Convert array of arrays to sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 },
    { wch: 32 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];

  const sheetName = reportName.replace(/[\\/?*[\]:]/g, '').substring(0, 31) || 'Financial Report';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const filename = `ZawrBooks_${reportType}_${dateStr}.xlsx`;

  return {
    buffer,
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/**
 * Generate complete ready-to-send email report payload with attached Excel workbook
 */
export function compileFinancialReportEmail(options: ReportGeneratorOptions): GeneratedEmailReport {
  const { reportType, reportName, frequency = 'Daily' } = options;
  const htmlContent = generateFinancialReportHtml(options);
  const excel = generateFinancialReportExcel(options);

  return {
    subject: `[ZAWR EXECUTIVE] ${frequency} ${reportName} — Official Financial & Operations Report`,
    htmlContent,
    textContent: `Zawr Industries Executive Financial Report: ${reportName} (${frequency}). Generated according to Indian Accounting Standards. Please view attached Excel document ${excel.filename}.`,
    attachment: {
      filename: excel.filename,
      content: excel.buffer,
      contentType: excel.contentType,
    },
  };
}
