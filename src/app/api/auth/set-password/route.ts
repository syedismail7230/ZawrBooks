import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userRepository } from '@/lib/auth/userRepository';
import { hashPassword } from '@/lib/auth/crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, passwordHash } = body;

    // Check if user is authenticated or providing valid email
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const targetEmail = (email || session?.email || '').trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json(
        { success: false, message: 'User email is required to set a password.' },
        { status: 400 }
      );
    }

    let finalHash = passwordHash;
    if (!finalHash && password) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }
      finalHash = await hashPassword(password);
    }

    if (!finalHash) {
      return NextResponse.json(
        { success: false, message: 'A valid password is required.' },
        { status: 400 }
      );
    }

    // Ensure user exists or create them
    const user = userRepository.findOrCreate(targetEmail);
    userRepository.setPassword(user.email, finalHash);

    return NextResponse.json({
      success: true,
      message: 'Password successfully established.',
    });
  } catch (error) {
    console.error('[API AUTH SET-PASSWORD ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update password.' },
      { status: 500 }
    );
  }
}
