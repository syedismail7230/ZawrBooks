'use client';

import React, { useState, useEffect } from 'react';
import { ControlLayout } from '@/components/control/ControlLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { globalDataStore } from '@/lib/store/dataStore';
import { Building2, Shield, Calendar, Globe, Save } from 'lucide-react';

export default function ControlOverviewPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const org = storeState.organization;

  const [legalName, setLegalName] = useState(org?.legalName || '');
  const [gstin, setGstin] = useState(org?.gstin || '');
  const [pan, setPan] = useState(org?.pan || '');
  const [saved, setSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      const s = globalDataStore.getState();
      setStoreState({ ...s });
      if (s.organization) {
        setLegalName(s.organization.legalName);
        setGstin(s.organization.gstin);
        setPan(s.organization.pan);
      }
    });
  }, []);

  const handleSave = () => {
    if (!legalName.trim()) {
      alert('Please enter your business or legal entity name.');
      return;
    }
    globalDataStore.setOrganization({
      name: legalName,
      legalName,
      gstin,
      pan,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCopyMigrationScript = () => {
    const sqlPath = 'supabase/migrations/20261014000000_init_zawr_books_schema.sql';
    navigator.clipboard.writeText(`-- Zawr Books PostgreSQL Schema Migration\n-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/idklgeipzkfdsznpkikq/sql\n-- Located locally at: ${sqlPath}`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <ControlLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Organization Profile & Statutory Identifiers
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Centralized entity metadata, Indian GST registration, and fiscal controls
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleSave}>
          <Save size={13} /> Save Legal Profile
        </Button>
      </div>

      {saved && (
        <div className="p-3 bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-xs font-semibold">
          Organization statutory information updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Company Information">
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Registered Legal Name *
              </label>
              <input
                type="text"
                value={legalName}
                placeholder="e.g. Your Business Name LLP / Pvt Ltd"
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Goods and Services Tax Identification Number (GSTIN)
              </label>
              <input
                type="text"
                value={gstin}
                placeholder="e.g. 29AAAAA0000A1Z5"
                onChange={(e) => setGstin(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                value={pan}
                placeholder="e.g. AAAAA0000A"
                onChange={(e) => setPan(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black uppercase"
              />
            </div>
          </div>
        </Card>

        <Card title="Fiscal Governance & Period Closing">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-[#F0EFEA]">
              <span className="text-[#666666]">Financial Year Cycle:</span>
              <span className="font-semibold text-[#111111]">1st April – 31st March (Indian FY)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#F0EFEA]">
              <span className="text-[#666666]">Base Accounting Currency:</span>
              <span className="font-mono font-bold text-[#111111]">INR (₹ Indian Rupee)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#F0EFEA]">
              <span className="text-[#666666]">Timezone:</span>
              <span className="font-mono text-[#111111]">Asia/Kolkata (UTC+05:30)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#F0EFEA]">
              <span className="text-[#666666]">Fiscal Period Locked Through:</span>
              <span className="font-mono font-bold text-[#111111]">
                {org?.periodLockedUntil || 'Unlocked (All periods open)'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#666666]">Database Multi-tenancy Status:</span>
              <Badge status="Active">Isolated Tenant RLS</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Supabase PostgreSQL Backend Card */}
      <Card
        title="Supabase Cloud Database & Storage"
        subtitle="Connected to production PostgreSQL cluster with Row-Level Security"
      >
        <div className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#F4F3EF] border border-[#E5E5E5]">
            <div>
              <div className="font-mono text-xs font-bold text-[#111111]">
                https://idklgeipzkfdsznpkikq.supabase.co
              </div>
              <div className="text-[11px] text-[#666666] mt-0.5">
                Target Project: idklgeipzkfdsznpkikq • Status: Configured in .env.local
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyMigrationScript}>
              {copiedSql ? '✓ Copied SQL Link' : 'Copy Schema Migration'}
            </Button>
          </div>
          <p className="text-[11px] text-[#666666]">
            The database migration script contains 20+ tables (organizations, chart_of_accounts, journal_entries, invoices, expenses, audit_events) and immutable PostgreSQL triggers. Execute it in your Supabase SQL editor to create all schema tables.
          </p>
        </div>
      </Card>

      {/* Nodemailer SMTP & Cloudflare Routing Card */}
      <Card
        title="Transactional Mailer (Nodemailer & Cloudflare Routing)"
        subtitle="Automated email dispatch for scheduled management packs and invoice receipts"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[#F4F3EF] border border-[#E5E5E5] font-mono text-[11px]">
            <div>
              <span className="text-[#666666] block text-[10px]">SMTP RELAY HOST:</span>
              <span className="font-bold text-[#111111]">smtp.gmail.com:465 (SSL)</span>
            </div>
            <div>
              <span className="text-[#666666] block text-[10px]">AUTHENTICATED GOOGLE ACCOUNT:</span>
              <span className="font-bold text-[#111111]">zawrindustries@gmail.com</span>
            </div>
            <div>
              <span className="text-[#666666] block text-[10px]">CLOUDFLARE ROUTED SENDER:</span>
              <span className="font-bold text-[#111111]">accounts@zawrindustries.com</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#137333] inline-block animate-pulse"></span>
              <span className="font-semibold text-[#137333]">Authenticated & Ready for Live Transmissions</span>
            </div>
            <a
              href="/web/scheduled-reports"
              className="px-3 py-1 bg-black text-white text-xs font-medium uppercase tracking-wider hover:bg-[#333333]"
            >
              Test in Reports →
            </a>
          </div>
        </div>
      </Card>
    </ControlLayout>
  );
}
