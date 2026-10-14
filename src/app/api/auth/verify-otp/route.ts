import { NextResponse } from 'next/server';
import { otpService } from '@/lib/auth/otpService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const verification = otpService.verifyOtp(normalizedEmail, String(code));

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid verification code.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message: 'Email successfully verified.',
    });
  } catch (error) {
    console.error('[API AUTH VERIFY-OTP ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during verification.' },
      { status: 500 }
    );
  }
}
