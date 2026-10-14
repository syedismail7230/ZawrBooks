import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/store/serverStore';

export async function GET() {
  try {
    const organization = serverStore.getOrganization();
    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = serverStore.saveOrganization(body);
    return NextResponse.json({
      success: true,
      organization: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
