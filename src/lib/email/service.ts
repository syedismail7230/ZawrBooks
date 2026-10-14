import nodemailer from 'nodemailer';

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  cid?: string;
  contentDisposition?: 'attachment' | 'inline';
}

export interface SendEmailPayload {
  to: string[] | string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: EmailAttachment[];
  from?: string;
  replyTo?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId: string;
  provider: string;
  timestamp: string;
  error?: string;
}

export interface IEmailProvider {
  name: string;
  isConfigured: () => boolean;
  sendEmail: (payload: SendEmailPayload) => Promise<EmailDeliveryResult>;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || 'zawrindustries@gmail.com';
  // Strip whitespace from Google App Password
  const pass = (process.env.SMTP_PASS || 'llul dirv bmxf ndsc').replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export class NodemailerEmailService implements IEmailProvider {
  name = 'Zawr Nodemailer Engine (Gmail SMTP + Cloudflare Routing)';

  isConfigured(): boolean {
    return !!(process.env.SMTP_USER || process.env.SMTP_HOST);
  }

  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = getTransporter();
      await transporter.verify();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<EmailDeliveryResult> {
    const timestamp = new Date().toISOString();
    const fallbackId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const transporter = getTransporter();

      const defaultFrom = process.env.SMTP_FROM || '"Zawr Books" <accounts@zawrindustries.com>';
      const defaultReplyTo = process.env.SMTP_REPLY_TO || 'accounts@zawrindustries.com';

      const mailOptions = {
        from: payload.from || defaultFrom,
        to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
        replyTo: payload.replyTo || defaultReplyTo,
        subject: payload.subject,
        text: payload.textContent || payload.htmlContent.replace(/<[^>]+>/g, ''),
        html: payload.htmlContent,
        attachments: payload.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          ...(att.cid
            ? {
                cid: att.cid,
                contentDisposition: att.contentDisposition || 'inline',
              }
            : {}),
        })),
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId || fallbackId,
        provider: 'Nodemailer (Gmail SMTP: zawrindustries@gmail.com via Cloudflare: accounts@zawrindustries.com)',
        timestamp,
      };
    } catch (err: unknown) {
      console.error('[Nodemailer Send Error]:', err);
      return {
        success: false,
        messageId: fallbackId,
        provider: 'Nodemailer (Gmail SMTP)',
        timestamp,
        error: (err as Error).message,
      };
    }
  }
}

export const emailService = new NodemailerEmailService();
