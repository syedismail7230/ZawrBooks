import { NextResponse } from 'next/server';
import { otpService } from '@/lib/auth/otpService';
import { userRepository } from '@/lib/auth/userRepository';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const verification = otpService.verifyOtp(normalizedEmail, String(code));

    if (!verification.success) {
      return NextResponse.json(
        { success: false, message: verification.error || 'Invalid or expired verification code.' },
        { status: 401 }
      );
    }

    // OTP verified: find or provision user
    const user = userRepository.findOrCreate(normalizedEmail);
    userRepository.updateLastLogin(user.email);

    // Issue signed session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
      },
      hasPassword: !!user.passwordHash,
      message: 'Verification successful.',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[API AUTH VERIFY-OTP ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during verification.' },
      { status: 500 }
    );
  }
}
