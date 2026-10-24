import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/store/serverStore';
import { emailService } from '@/lib/email/service';
import { ReportSchedule } from '@/types';

export async function GET(request: Request) {
  return handleCronExecution(request);
}

export async function POST(request: Request) {
  return handleCronExecution(request);
}

async function handleCronExecution(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization');
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  const cronSecret = process.env.CRON_SECRET || 'zawr-cron-secret-2026';
  const queryKey = url.searchParams.get('key');
  const force = url.searchParams.get('force') === 'true';
  const targetScheduleId = url.searchParams.get('scheduleId');

  // Verify authorization if CRON_SECRET is configured in production
  const isVercelCron = vercelCronHeader === '1';
  const isAuthorizedBearer = authHeader === `Bearer ${cronSecret}`;
  const isAuthorizedKey = queryKey === cronSecret;
  const isLocalOrDev = process.env.NODE_ENV !== 'production';

  if (!isLocalOrDev && !isVercelCron && !isAuthorizedBearer && !isAuthorizedKey && process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized routine cron invocation. Provide Authorization Bearer or valid key.' },
      { status: 401 }
    );
  }

  // Read current enterprise state directly from disk/serverStore
  const store = serverStore.getStoreState();
  const allSchedules = store.reportSchedules || [];
  const now = Date.now();

  // Filter schedules that are active and due (or force run)
  const schedulesToRun: ReportSchedule[] = allSchedules.filter((sched) => {
    if (!sched.isActive) return false;
    if (targetScheduleId && sched.id !== targetScheduleId) return false;
    if (force) return true;

    // Routine due calculation:
    if (!sched.lastRunAt || !sched.nextRunAt) return true;
    const nextRunTime = new Date(sched.nextRunAt).getTime();
    return !isNaN(nextRunTime) && nextRunTime <= now;
  });

  const executionResults = [];

  for (const schedule of schedulesToRun) {
    try {
      // 1. Generate executive HTML email template and Excel attachment
      const { compileFinancialReportEmail } = await import('@/lib/email/reportEmailGenerator');
      const compiled = compileFinancialReportEmail({
        reportType: schedule.reportType,
        reportName: schedule.reportName,
        frequency: schedule.frequency,
        recipientEmail: schedule.recipientEmails[0] || 'accounts@zawrindustries.com',
        storeState: store as any,
      });

      // 2. Dispatch email via Nodemailer (Gmail SMTP + Cloudflare Routing)
      const sendResult = await emailService.sendEmail({
        to: schedule.recipientEmails,
        subject: compiled.subject,
        htmlContent: compiled.htmlContent,
        textContent: compiled.textContent,
        attachments: [compiled.attachment, ...(compiled.attachments || [])],
      });

      // 3. Register execution in serverStore and calculate next run date
      const triggerRes = serverStore.triggerScheduledReport(schedule.id, {
        status: sendResult.success ? 'Success' : 'Failed',
        recipients: schedule.recipientEmails,
        errorMessage: sendResult.error,
      });

      executionResults.push({
        scheduleId: schedule.id,
        name: schedule.reportName,
        frequency: schedule.frequency,
        status: sendResult.success ? 'Success' : 'Failed',
        recipients: schedule.recipientEmails,
        messageId: sendResult.messageId,
        error: sendResult.error,
        attachment: compiled.attachment.filename,
        nextRunAt: triggerRes.schedule?.nextRunAt,
      });
    } catch (err: unknown) {
      console.error(`[CRON ERROR] Failed to execute routine schedule ${schedule.id}:`, err);
      executionResults.push({
        scheduleId: schedule.id,
        name: schedule.reportName,
        status: 'Failed',
        recipients: schedule.recipientEmails,
        error: (err as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    totalActiveSchedules: allSchedules.filter((s) => s.isActive).length,
    processedCount: executionResults.length,
    timestamp: new Date().toISOString(),
    reports: executionResults,
  });
}
