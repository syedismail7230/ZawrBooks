import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/auth/userRepository';
import { hashPassword } from '@/lib/auth/crypto';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { notifyAdminSecurityEvent } from '@/lib/auth/securityNotifier';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide both email and password.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = userRepository.findByEmail(normalizedEmail);

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const clientUserAgent = req.headers.get('user-agent') || undefined;

    if (!user) {
      // Dispatches security alert for unknown account sign-up/login attempt
      notifyAdminSecurityEvent({
        eventType: 'SIGNUP_ATTEMPT',
        email: normalizedEmail,
        method: 'Password',
        reason: 'Unregistered user attempted password authentication',
        ipAddress: clientIp,
        userAgent: clientUserAgent,
      }).catch((err) => console.error('[SECURITY NOTIFIER]', err));

      return NextResponse.json(
        {
          success: false,
          message: 'Account not recognized. Please sign in via Email OTP to authenticate and register.',
        },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          code: 'NO_PASSWORD_SET',
          message: 'No password has been set for this account yet. Please sign in with Email OTP to set your password.',
        },
        { status: 403 }
      );
    }

    const inputHash = await hashPassword(password);
    if (inputHash !== user.passwordHash) {
      // Dispatches security alert for failed login attempt
      notifyAdminSecurityEvent({
        eventType: 'LOGIN_FAILED',
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        method: 'Password',
        reason: 'Incorrect password provided',
        ipAddress: clientIp,
        userAgent: clientUserAgent,
      }).catch((err) => console.error('[SECURITY NOTIFIER]', err));

      return NextResponse.json(
        {
          success: false,
          message: 'Invalid password. You can also sign in using Email OTP.',
        },
        { status: 401 }
      );
    }

    // Authentication successful: issue signed session token
    userRepository.updateLastLogin(user.email);

    // Dispatches security alert for successful login
    notifyAdminSecurityEvent({
      eventType: 'LOGIN_SUCCESS',
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      method: 'Password',
      ipAddress: clientIp,
      userAgent: clientUserAgent,
    }).catch((err) => console.error('[SECURITY NOTIFIER]', err));

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
      message: 'Authentication successful.',
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
    console.error('[API AUTH LOGIN ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred during login.' },
      { status: 500 }
    );
  }
}
