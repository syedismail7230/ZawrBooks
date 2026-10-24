/**
 * ZawrBooks Enterprise Security Notification Service
 * 
 * Dispatches real-time security alerts to admin@zawrindustries.com whenever:
 * 1. A user logs into the platform (Password or OTP)
 * 2. Someone attempts to register / sign up for an account
 * 3. An authentication attempt fails (unrecognized account or invalid credentials)
 */

import { emailService } from '@/lib/email/service';

export interface SecurityEventData {
  eventType: 'LOGIN_SUCCESS' | 'SIGNUP_ATTEMPT' | 'LOGIN_FAILED' | 'PASSWORD_SET';
  email: string;
  fullName?: string;
  role?: string;
  method?: 'Password' | 'OTP' | 'Self-Registration';
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

const ADMIN_ALERT_EMAIL = 'admin@zawrindustries.com';

/**
 * Format timestamp into standard Indian date string
 */
function formatEventTimestamp(): string {
  const now = new Date();
  return (
    now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    }) +
    ' at ' +
    now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }) +
    ' IST'
  );
}

export async function notifyAdminSecurityEvent(data: SecurityEventData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const timestampStr = formatEventTimestamp();
    const eventLabels = {
      LOGIN_SUCCESS: {
        title: 'User Login Authorized',
        badgeColor: '#137333',
        badgeBg: '#E6F4EA',
        subjectPrefix: '[SECURITY ALERT] User Login',
      },
      SIGNUP_ATTEMPT: {
        title: 'New Account Sign-Up / Registration Attempt',
        badgeColor: '#1A73E8',
        badgeBg: '#E8F0FE',
        subjectPrefix: '[SECURITY NOTICE] New Sign-Up Attempt',
      },
      LOGIN_FAILED: {
        title: 'Failed Authentication Warning',
        badgeColor: '#C5221F',
        badgeBg: '#FCE8E6',
        subjectPrefix: '[SECURITY WARNING] Failed Login Attempt',
      },
      PASSWORD_SET: {
        title: 'Security Password Updated',
        badgeColor: '#0D652D',
        badgeBg: '#E6F4EA',
        subjectPrefix: '[SECURITY NOTICE] Password Updated',
      },
    };

    const config = eventLabels[data.eventType];
    const subject = `${config.subjectPrefix}: ${data.email} — ZawrBooks Financial Platform`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${config.title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .sec-outer-cell {
        padding: 12px 6px !important;
      }
      .sec-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 6px !important;
        box-sizing: border-box !important;
      }
      .sec-header {
        padding: 16px 14px !important;
      }
      .sec-body {
        padding: 20px 14px !important;
      }
      .sec-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
        padding: 12px 14px !important;
      }
      .sec-label {
        width: 40% !important;
        font-size: 11px !important;
        padding: 8px 10px !important;
      }
      .sec-val {
        font-size: 12px !important;
        padding: 8px 10px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f3ef; padding: 32px 16px;">
    <tr>
      <td class="sec-outer-cell" align="center">
        <!-- Main Card Container -->
        <table class="sec-container" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e0dfd5; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); box-sizing: border-box;">
          
          <!-- Top Header Banner -->
          <tr>
            <td class="sec-header" style="background-color: #111111; padding: 24px 32px; color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #10B981; display: block; margin-bottom: 4px;">
                      SECURITY OPERATIONS & AUDIT TRAIL
                    </span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">
                      ZAWR BOOKS
                    </h1>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background-color: ${config.badgeBg}; color: ${config.badgeColor};">
                      ${config.title.toUpperCase()}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notice Body -->
          <tr>
            <td class="sec-body" style="padding: 32px;">
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #333333;">
                An authentication event was recorded on the <strong>ZawrBooks Financial Platform</strong>. Review the session and security audit details below:
              </p>

              <!-- Audit Detail Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #ebebeb; border-radius: 6px; background-color: #fafaf9; margin-bottom: 24px;">
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-weight: 700; color: #666666; width: 35%;">Target Email</td>
                  <td class="sec-val" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 13px; font-weight: 700; color: #111111;">${data.email}</td>
                </tr>
                ${data.fullName ? `
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-weight: 700; color: #666666;">User Full Name</td>
                  <td class="sec-val" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 13px; color: #111111;">${data.fullName}</td>
                </tr>` : ''}
                ${data.role ? `
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-weight: 700; color: #666666;">Account Role</td>
                  <td class="sec-val" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 13px; color: #111111; text-transform: capitalize;">${data.role}</td>
                </tr>` : ''}
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-weight: 700; color: #666666;">Auth Method</td>
                  <td class="sec-val" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 13px; color: #111111;">${data.method || 'Standard Authentication'}</td>
                </tr>
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-weight: 700; color: #666666;">Timestamp</td>
                  <td class="sec-val" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 13px; color: #111111;">${timestampStr}</td>
                </tr>
                ${data.ipAddress ? `
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-weight: 700; color: #666666;">Client IP Address</td>
                  <td class="sec-val" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-family: monospace; color: #111111;">${data.ipAddress}</td>
                </tr>` : ''}
                ${data.userAgent ? `
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 12px; font-weight: 700; color: #666666;">Device / User Agent</td>
                  <td class="sec-val" style="padding: 12px 16px; border-bottom: 1px solid #ebebeb; font-size: 11px; font-family: monospace; color: #555555; word-break: break-all;">${data.userAgent}</td>
                </tr>` : ''}
                ${data.reason ? `
                <tr>
                  <td class="sec-label" style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #666666;">Details / Reason</td>
                  <td class="sec-val" style="padding: 12px 16px; font-size: 13px; color: #C5221F; font-weight: 600;">${data.reason}</td>
                </tr>` : ''}
              </table>

              <!-- Action Link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="https://books.zawrindustries.com/control" class="sec-btn" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 28px; border-radius: 4px; letter-spacing: 0.5px;">
                      Open Security Control Centre
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7f7f5; padding: 20px 32px; border-top: 1px solid #ebebeb; font-size: 11px; color: #777777; text-align: center; line-height: 1.5;">
              This is an automated real-time security notice dispatched to <strong>${ADMIN_ALERT_EMAIL}</strong>.<br>
              Zawr Industries LLP · Security Operations · Bengaluru, India · <a href="https://zawrindustries.com" style="color: #111111;">zawrindustries.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
[ZAWR BOOKS SECURITY ALERT]
Event: ${config.title}
Target: ${data.email}
Name: ${data.fullName || 'N/A'}
Role: ${data.role || 'N/A'}
Auth Method: ${data.method || 'Standard'}
Timestamp: ${timestampStr}
Client IP: ${data.ipAddress || 'Unknown'}
Details: ${data.reason || 'None'}

Access Control Centre: https://books.zawrindustries.com/control
    `.trim();

    return await emailService.sendEmail({
      to: ADMIN_ALERT_EMAIL,
      subject,
      htmlContent,
      textContent,
    });
  } catch (err: unknown) {
    console.error('[SECURITY NOTIFICATION ERROR]', err);
    return {
      success: false,
      error: (err as Error).message || 'Failed to dispatch security notification',
    };
  }
}
