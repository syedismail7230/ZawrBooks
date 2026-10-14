import { emailService } from '@/lib/email/service';
import fs from 'fs';
import path from 'path';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP store (persists across requests during runtime)
const otpStore = new Map<string, OtpRecord>();

export class OtpService {
  /**
   * Generate and store a secure 6-digit OTP for the given email
   */
  public generateOtp(email: string): string {
    const normalizedEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(normalizedEmail, {
      code,
      expiresAt,
      attempts: 0,
    });

    console.log(`[AUTH OTP GENERATED] For ${normalizedEmail}: ${code} (Expires in 10m)`);
    return code;
  }

  /**
   * Verify candidate OTP
   */
  public verifyOtp(email: string, candidateCode: string): { success: boolean; error?: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return { success: false, error: 'No active verification code found for this email. Please request a new code.' };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return { success: false, error: 'Verification code has expired. Please request a new code.' };
    }

    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
    }

    if (record.code !== candidateCode.trim()) {
      record.attempts += 1;
      return { success: false, error: 'Incorrect verification code. Please check your email and try again.' };
    }

    // Success: consume OTP immediately (single-use)
    otpStore.delete(normalizedEmail);
    return { success: true };
  }

  /**
   * Send the OTP email using Nodemailer and executive branded template with actual logo
   */
  public async sendOtpEmail(email: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Read logo attachment for inline CID
    let logoBuffer: Buffer;
    try {
      const emailLogoPath = path.join(process.cwd(), 'public', 'logo-email.png');
      const fallbackLogoPath = path.join(process.cwd(), 'public', 'logo-landscape.png');
      if (fs.existsSync(emailLogoPath)) {
        logoBuffer = fs.readFileSync(emailLogoPath);
      } else if (fs.existsSync(fallbackLogoPath)) {
        logoBuffer = fs.readFileSync(fallbackLogoPath);
      } else {
        logoBuffer = Buffer.from('');
      }
    } catch {
      logoBuffer = Buffer.from('');
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your Zawr Books Verification Code</title>
</head>
<body style="margin: 0; padding: 40px 15px; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; padding: 36px 32px; border: 1px solid #e0e0e0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
    <!-- Header with actual logo -->
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="left" valign="middle">
          <img src="cid:zawr-brand-logo" alt="ZAWR BOOKS" height="32" style="display: block; height: 32px; width: auto; max-width: 220px; border: 0;" />
        </td>
        <td align="right" valign="middle" style="font-size: 11px; font-weight: 600; color: #5f6368; letter-spacing: 1px; text-transform: uppercase;">
          AUTHENTICATION
        </td>
      </tr>
    </table>

    <div style="height: 1px; background-color: #ebebeb; margin-top: 16px; margin-bottom: 24px;"></div>

    <h1 style="font-size: 18px; font-weight: 700; color: #111111; margin: 0 0 10px 0;">
      One-Time Sign In Code
    </h1>

    <p style="font-size: 13px; color: #555555; line-height: 1.5; margin: 0 0 24px 0;">
      Use the following single-use verification code to authenticate your session and access the financial dashboard:
    </p>

    <!-- Large Monospace OTP Display -->
    <div style="background-color: #f4f3ef; border: 1px solid #e5e5e5; border-radius: 4px; padding: 18px 20px; text-align: center; margin: 0 0 24px 0;">
      <span style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #111111; display: inline-block;">
        ${code}
      </span>
    </div>

    <p style="font-size: 12px; color: #666666; line-height: 1.5; margin: 0 0 8px 0;">
      • This code is valid for <strong>10 minutes</strong>.
    </p>
    <p style="font-size: 12px; color: #666666; line-height: 1.5; margin: 0 0 24px 0;">
      • If you did not request this login code, you can safely ignore this email.
    </p>

    <div style="border-top: 1px solid #eeeeee; padding-top: 16px; font-size: 11px; color: #999999; text-align: center;">
      Zawr Books • Secured with Two-Factor Email Verification<br>
      Automated cryptographic dispatch via accounts@zawrindustries.com
    </div>
  </div>
</body>
</html>
    `;

    return emailService.sendEmail({
      to: normalizedEmail,
      subject: `[Zawr Books] ${code} is your sign-in verification code`,
      htmlContent: html,
      textContent: `Your Zawr Books sign-in code is: ${code}. It expires in 10 minutes.`,
      attachments: [
        {
          filename: 'zawr-logo.png',
          content: logoBuffer,
          contentType: 'image/png',
          cid: 'zawr-brand-logo',
          contentDisposition: 'inline',
        },
      ],
    });
  }
}

export const otpService = new OtpService();
