import { NextResponse } from 'next/server';
import { globalDataStore } from '@/lib/store/dataStore';
import { emailService } from '@/lib/email/service';

export async function GET(request: Request) {
  return handleCronExecution(request);
}

export async function POST(request: Request) {
  return handleCronExecution(request);
}

async function handleCronExecution(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'zawr-cron-secret-2026';

  // Check authorization token if configured in production
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
  }

  const store = globalDataStore.getState();
  const schedules = store.reportSchedules.filter((s) => s.isActive);
  const executionResults = [];

  for (const schedule of schedules) {
    const triggerRes = globalDataStore.triggerScheduledReport(schedule.id);

    // Generate executive email template and Excel attachment matching UI/UX spec
    const { compileFinancialReportEmail } = await import('@/lib/email/reportEmailGenerator');
    const compiled = compileFinancialReportEmail({
      reportType: schedule.reportType,
      reportName: schedule.reportName,
      frequency: schedule.frequency,
      recipientEmail: schedule.recipientEmails[0] || 'accounts@zawrindustries.com',
      storeState: store,
    });

    // Send transactional email via Nodemailer with attached Excel workbook
    const sendResult = await emailService.sendEmail({
      to: schedule.recipientEmails,
      subject: compiled.subject,
      htmlContent: compiled.htmlContent,
      textContent: compiled.textContent,
      attachments: [compiled.attachment, ...(compiled.attachments || [])],
    });

    executionResults.push({
      scheduleId: schedule.id,
      name: schedule.reportName,
      status: triggerRes.log.status,
      recipients: schedule.recipientEmails,
      messageId: sendResult.messageId,
      attachment: compiled.attachment.filename,
    });
  }

  return NextResponse.json({
    success: true,
    processedCount: executionResults.length,
    timestamp: new Date().toISOString(),
    reports: executionResults,
  });
}
