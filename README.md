# ZawrBooks

AI-Powered Bookkeeping, Invoicing, Statutory Tax Preparation (GST) & Financial Management SaaS for modern businesses. Built by **Zawr Industries**.

## Overview

Zawr Books is a financial operating system featuring:
- **Double-Entry Accounting Engine**: Enforces strict mathematical balance ($Assets = Liabilities + Equity$) with zero unposted mutations.
- **Automated Financial Reporting**: Profit & Loss Statement, Balance Sheet, Trial Balance, Accounts Receivable (AR) Ageing, Accounts Payable (AP) Ageing, and GST 3B Preparation Summary.
- **Executive Email Distribution**: Transactional email reporting engine powered by Nodemailer (Gmail SMTP + Cloudflare Email Routing) with automatic `.xlsx` Excel spreadsheet compilation and attachment.
- **Zero-Mock Real-Time Architecture**: Directly integrated with Supabase and live general ledger stores.
- **Cryptographic Audit Trail**: SHA-256 tamper-evident sync chain for regulatory compliance.

## Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- npm, yarn, or pnpm

### 2. Environment Configuration
Create a `.env.local` file with the following variables:
```bash
# Supabase Live Data Connection
NEXT_PUBLIC_SUPABASE_URL=https://idklgeipzkfdsznpkikq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Nodemailer / Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=zawrindustries@gmail.com
SMTP_PASS=your_google_app_password
SMTP_FROM="Zawr Books" <accounts@zawrindustries.com>
SMTP_REPLY_TO=accounts@zawrindustries.com
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access Zawr Books.

### 4. Run Test Suite
```bash
npm test
```

### 5. Build for Production
```bash
npm run build
```

---
© 2026 Zawr Industries. All rights reserved.
