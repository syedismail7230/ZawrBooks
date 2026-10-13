import { NextResponse } from 'next/server';
import { defaultOcrProvider } from '@/lib/ocr/extractor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileData, fileName } = body;

    const result = await defaultOcrProvider.extractReceipt(fileData || '', fileName || 'receipt.pdf');
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
