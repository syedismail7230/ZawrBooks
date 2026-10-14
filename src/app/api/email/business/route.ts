import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    let result;

    switch (action) {
      case 'INVOICE_SEND':
        result = await sendCustomerInvoiceEmail(payload);
        break;

      case 'PAYMENT_REMINDER':
        result = await sendPaymentReminderEmail(payload.invoice, payload.customer);
        break;

      case 'PAYMENT_RECEIPT':
        result = await sendPaymentReceiptEmail(payload);
        break;

      case 'CUSTOMER_STATEMENT':
        result = await sendCustomerStatementEmail(payload.customer, payload.invoices || []);
        break;

      case 'VENDOR_REMITTANCE':
        result = await sendVendorRemittanceEmail(payload);
        break;

      case 'APPROVAL_REQUEST':
        result = await sendApprovalRequestEmail(payload.expense);
        break;

      case 'APPROVAL_DECISION':
        result = await sendApprovalDecisionEmail(payload.expense, payload.decision, payload.comment);
        break;

      case 'BUDGET_ALERT':
        result = await sendBudgetAlertEmail(payload.budget, payload.percent);
        break;

      default:
        return NextResponse.json({ success: false, error: `Unknown business email action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[BUSINESS EMAIL DISPATCH ERROR]:', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
