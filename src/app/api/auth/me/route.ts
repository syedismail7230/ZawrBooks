import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { userRepository } from '@/lib/auth/userRepository';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const sessionUser = await verifySessionToken(token);
    if (!sessionUser) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    // Retrieve fresh user info from repository
    const dbUser = userRepository.findByEmail(sessionUser.email);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser?.id || sessionUser.userId,
        email: sessionUser.email,
        fullName: dbUser?.fullName || sessionUser.fullName,
        role: dbUser?.role || sessionUser.role,
        department: dbUser?.department || sessionUser.department,
        hasPassword: !!dbUser?.passwordHash,
      },
    });
  } catch (error) {
    console.error('[API AUTH ME ERROR]', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
