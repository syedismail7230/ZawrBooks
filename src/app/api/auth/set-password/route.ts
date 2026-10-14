import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, passwordHash } = body;

    if (!email || !passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Email and password hash are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message: 'Password successfully established.',
    });
  } catch (error) {
    console.error('[API AUTH SET-PASSWORD ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while saving password.' },
      { status: 500 }
    );
  }
}
