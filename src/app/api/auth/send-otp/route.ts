import { NextResponse } from 'next/server';
import { otpService } from '@/lib/auth/otpService';
import { notifyAdminSecurityEvent } from '@/lib/auth/securityNotifier';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate code
    const code = otpService.generateOtp(normalizedEmail);

    // Send email using real Nodemailer transport
    const sendResult = await otpService.sendOtpEmail(normalizedEmail, code);

    // Notify admin@zawrindustries.com of authentication/registration attempt
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const clientUserAgent = req.headers.get('user-agent') || undefined;

    notifyAdminSecurityEvent({
      eventType: 'SIGNUP_ATTEMPT',
      email: normalizedEmail,
      method: 'OTP',
      reason: 'User initiated OTP verification / sign-up flow',
      ipAddress: clientIp,
      userAgent: clientUserAgent,
    }).catch((err: unknown) => console.error('[SECURITY NOTIFIER]', err));

    if (!sendResult.success) {
      console.error('[AUTH OTP DISPATCH ERROR]', sendResult.error);
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || 'Failed to dispatch verification email. Please try again.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A single-use verification code has been dispatched to ${normalizedEmail}`,
    });
  } catch (error) {
    console.error('[API AUTH SEND-OTP ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
