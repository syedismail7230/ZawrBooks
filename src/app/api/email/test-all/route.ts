import { NextResponse } from 'next/server';
import { emailService } from '@/lib/email/service';
import { compileFinancialReportEmail } from '@/lib/email/reportEmailGenerator';
import { notifyAdminSecurityEvent } from '@/lib/auth/securityNotifier';
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

    // 3. Financial Report Templates (ProfitLoss, BalanceSheet, TrialBalance, GSTSummary, CashFlow)
    const reportTypes: Array<{ type: ReportType; name: string }> = [
      { type: 'ProfitLoss', name: 'Profit & Loss Statement' },
      { type: 'BalanceSheet', name: 'Balance Sheet' },
      { type: 'TrialBalance', name: 'Trial Balance' },
      { type: 'GSTSummary', name: 'GST 3B Preparation Summary' },
      { type: 'CashFlow', name: 'Cash Flow Statement' },
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
