import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Deployment build version information
const APP_VERSION = '1.0.1';
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || `build-${Date.now().toString(36)}`;
const BUILD_TIME = new Date().toISOString();

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      appName: 'Zawr Books',
      version: APP_VERSION,
      buildId: BUILD_ID,
      buildTime: BUILD_TIME,
      serverUrl: 'https://books.zawrindustries.com',
      otaEnabled: true,
      otaType: 'live-web-sync',
      nativeApk: {
        versionCode: 1,
        versionName: '1.0.0',
        downloadUrl: 'https://books.zawrindustries.com/ZawrBooks.apk',
        required: false,
      },
      message: 'App is running on live server over-the-air. All web, UI, scanner, and ledger changes update automatically.',
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
