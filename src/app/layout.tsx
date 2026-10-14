import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zawr Books — AI-Powered Bookkeeping & Financial Management',
  description:
    'AI-powered bookkeeping, automated receipt extraction, double-entry general ledger, and scheduled financial reporting for Indian businesses.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-square.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: [{ url: '/logo-square.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F4F3EF] text-[#111111]">
        {children}
      </body>
    </html>
  );
}
