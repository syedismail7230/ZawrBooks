import { NextResponse } from 'next/server';
import { emailService } from '@/lib/email/service';

export async function GET() {
  try {
    const verification = await emailService.verifyConnection();
    return NextResponse.json({
      configured: emailService.isConfigured(),
      provider: emailService.name,
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpUser: process.env.SMTP_USER || 'zawrindustries@gmail.com',
      fromAddress: process.env.SMTP_FROM || 'Zawr Books <accounts@zawrindustries.com>',
      replyTo: process.env.SMTP_REPLY_TO || 'accounts@zawrindustries.com',
      verified: verification.success,
      error: verification.error,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // If reportType is provided, automatically generate the executive HTML and Excel attachment
    if (body.reportType) {
      const { globalDataStore } = await import('@/lib/store/dataStore');
      const { compileFinancialReportEmail } = await import('@/lib/email/reportEmailGenerator');

      const storeState = globalDataStore.getState();
      const compiled = compileFinancialReportEmail({
        reportType: body.reportType,
        reportName: body.reportName || 'Financial Performance & Operations Report',
        frequency: body.frequency || 'Daily',
        recipientEmail: Array.isArray(body.to) ? body.to[0] : body.to,
        storeState,
      });

      const payload = {
        to: body.to || 'accounts@zawrindustries.com',
        subject: body.subject || compiled.subject,
        htmlContent: body.htmlContent || compiled.htmlContent,
        textContent: body.textContent || compiled.textContent,
        attachments: [
          compiled.attachment,
          ...(body.attachments || []),
        ],
        from: body.from,
        replyTo: body.replyTo,
      };

      const result = await emailService.sendEmail(payload);
      return NextResponse.json({
        ...result,
        attachmentName: compiled.attachment.filename,
        reportType: body.reportType,
      });
    }

    const result = await emailService.sendEmail(body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
