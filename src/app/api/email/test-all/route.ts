import { NextResponse } from 'next/server';
import { emailService } from '@/lib/email/service';
import { compileFinancialReportEmail } from '@/lib/email/reportEmailGenerator';
import { notifyAdminSecurityEvent } from '@/lib/auth/securityNotifier';
import {
  sendCustomerInvoiceEmail,
  sendPaymentReminderEmail,
  sendPaymentReceiptEmail,
  sendCustomerStatementEmail,
  sendVendorRemittanceEmail,
  sendApprovalRequestEmail,
  sendApprovalDecisionEmail,
  sendBudgetAlertEmail,
} from '@/lib/email/businessNotifier';
import { globalDataStore } from '@/lib/store/dataStore';
import { ReportType } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = body.to || 'admin@zawrindustries.com';
    const storeState = body.storeState || globalDataStore.getState();

    const results: Array<{ template: string; success: boolean; messageId?: string; error?: string }> = [];

    // 1. Security Alert: Successful Login
    const loginAlert = await notifyAdminSecurityEvent({
      eventType: 'LOGIN_SUCCESS',
      email: 'syedismail7230@gmail.com',
      fullName: 'Syed Ismail Zabiulla',
      role: 'owner',
      method: 'Password',
      ipAddress: '103.180.12.89',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    });
    results.push({ template: 'Security: User Login Alert', ...loginAlert });

    // 2. Security Alert: New Sign-Up Attempt
    const signupAlert = await notifyAdminSecurityEvent({
      eventType: 'SIGNUP_ATTEMPT',
      email: 'newuser@example.com',
      method: 'OTP',
      reason: 'New user requested OTP to sign up / register',
      ipAddress: '49.207.198.42',
      userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:120.0)',
    });
    results.push({ template: 'Security: New Sign-Up Attempt', ...signupAlert });

    // 3. Financial Reports including ExecutiveCombined (Combined Report)
    const reportTypes: Array<{ type: ReportType; name: string }> = [
      { type: 'ExecutiveCombined', name: 'Comprehensive Executive Financial Dossier (Combined Report)' },
      { type: 'ProfitLoss', name: 'Profit & Loss Statement' },
      { type: 'BalanceSheet', name: 'Balance Sheet' },
      { type: 'TrialBalance', name: 'Trial Balance' },
      { type: 'GSTSummary', name: 'GST 3B Preparation Summary' },
    ];

    for (const item of reportTypes) {
      const compiled = compileFinancialReportEmail({
        reportType: item.type,
        reportName: item.name,
        frequency: 'Daily',
        recipientEmail: targetEmail,
        storeState,
      });

      const res = await emailService.sendEmail({
        to: targetEmail,
        subject: compiled.subject,
        htmlContent: compiled.htmlContent,
        textContent: compiled.textContent,
        attachments: [compiled.attachment],
      });

      results.push({ template: `Financial Report: ${item.name}`, ...res });
    }

    // 4. Business Transactional: Customer Tax Invoice
    const sampleInv = storeState.invoices[0] || {
      id: 'inv-test-1',
      invoiceNumber: 'INV-2026-001',
      invoiceDate: '2026-10-14',
      dueDate: '2026-10-28',
      customerId: 'cust-1',
      customerName: 'Acme Technologies Pvt Ltd',
      customerGstin: '29ABCDE1234F1Z5',
      subtotalPaise: 25000000,
      totalTaxPaise: 4500000,
      totalPaise: 29500000,
      amountPaidPaise: 0,
      status: 'Sent',
      items: [
        {
          id: 'item-1',
          description: 'Enterprise ERP Implementation & Cloud Consulting',
          hsnSac: '998313',
          quantity: 1,
          unitPricePaise: 25000000,
          taxableAmountPaise: 25000000,
          cgstPaise: 2250000,
          sgstPaise: 2250000,
          igstPaise: 0,
          totalPaise: 29500000,
        },
      ],
    };

    const invoiceRes = await sendCustomerInvoiceEmail({
      invoice: sampleInv as any,
      customer: storeState.customers[0],
      recipientEmail: targetEmail,
    });
    results.push({ template: 'Business: Customer Tax Invoice (+ Excel)', ...invoiceRes });

    // 5. Business Transactional: Payment Reminder
    const reminderRes = await sendPaymentReminderEmail(sampleInv as any, storeState.customers[0]);
    results.push({ template: 'Business: Payment Reminder', ...reminderRes });

    // 6. Business Transactional: Payment Receipt Voucher
    const receiptRes = await sendPaymentReceiptEmail({
      invoice: sampleInv as any,
      customer: storeState.customers[0],
      amountReceivedPaise: 29500000,
      utrReference: 'HDFCN2628491823',
      bankName: 'HDFC Bank - Operating Current Account (XX1841)',
    });
    results.push({ template: 'Business: Official Payment Receipt Voucher', ...receiptRes });

    // 7. Business Transactional: Customer Subledger Statement
    const sampleCustomer = storeState.customers[0] || {
      id: 'cust-1',
      name: 'Acme Technologies Pvt Ltd',
      legalName: 'Acme Technologies Private Limited',
      gstin: '29ABCDE1234F1Z5',
      email: targetEmail,
      phone: '+91 98765 43210',
      billingAddress: 'Tower B, Tech Park, Outer Ring Road, Bengaluru',
      outstandingBalancePaise: 29500000,
    };
    const statementRes = await sendCustomerStatementEmail(sampleCustomer as any, storeState.invoices);
    results.push({ template: 'Business: Customer Subledger Statement (+ Excel)', ...statementRes });

    // 8. Business Transactional: Vendor Remittance Advice
    const sampleBill = storeState.vendorBills[0] || {
      id: 'bill-test-1',
      vendorId: 'vend-1',
      vendorName: 'AWS Cloud Services India',
      billNumber: 'AWS-2026-9812',
      billDate: '2026-10-10',
      dueDate: '2026-10-25',
      subtotalPaise: 8400000,
      taxPaise: 1512000,
      totalPaise: 9912000,
      status: 'Paid',
    };
    const remittanceRes = await sendVendorRemittanceEmail({
      bill: sampleBill as any,
      vendor: storeState.vendors[0],
      paidAmountPaise: 9743760, // after 2% TDS
      tdsDeductedPaise: 168240,
      utrReference: 'HDFCR5202698124',
      paymentDate: '2026-10-14',
    });
    results.push({ template: 'Business: Vendor Payment Advice / Remittance', ...remittanceRes });

    // 9. Business Transactional: Approval Request & Decision
    const sampleExpense = storeState.expenses[0] || {
      id: 'exp-1',
      employeeName: 'Rahul Sharma',
      title: 'Annual Datacenter SSL & Infrastructure Licensing',
      vendorName: 'DigiCert Global',
      grandTotalPaise: 12500000,
      createdAt: '2026-10-14T10:00:00Z',
    };
    const approvalReqRes = await sendApprovalRequestEmail(sampleExpense as any);
    results.push({ template: 'Workflow: Managerial Approval Request', ...approvalReqRes });

    // 10. Cost Centre Budget Variance Alert
    const sampleBudget = storeState.budgets[0] || {
      name: 'Cloud & Hosting Infrastructure',
      costCentre: 'Engineering / Operations',
      budgetPaise: 10000000,
      actualPaise: 8800000,
    };
    const budgetRes = await sendBudgetAlertEmail(sampleBudget as any, 88);
    results.push({ template: 'Risk & Control: Budget Threshold Alert (88%)', ...budgetRes });

    return NextResponse.json({
      success: true,
      targetEmail,
      count: results.length,
      dispatchedAt: new Date().toISOString(),
      results,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
