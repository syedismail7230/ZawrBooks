'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { globalDataStore } from '@/lib/store/dataStore';
import { verifyAuditChainIntegrity } from '@/lib/audit/trail';
import { formatDateTime } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, History, Search, CheckCircle2 } from 'lucide-react';

export default function AuditTrailPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    isValid: boolean;
    details?: string;
  }>({ tested: false, isValid: true });

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleVerifyChain = () => {
    const res = verifyAuditChainIntegrity(storeState.auditEvents);
    setVerificationResult({
      tested: true,
      isValid: res.isValid,
      details: res.isValid
        ? `All ${storeState.auditEvents.length} audit blocks verified against cryptographic SHA-256 chain. Zero tampering detected.`
        : res.reason,
    });
  };

  const filteredEvents = storeState.auditEvents.filter((ev) => {
    const q = searchQuery.toLowerCase();
    return (
      ev.action.toLowerCase().includes(q) ||
      ev.actorName.toLowerCase().includes(q) ||
      ev.entityType.toLowerCase().includes(q) ||
      ev.id.toLowerCase().includes(q)
    );
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Tamper-Evident Audit Trail
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Cryptographically linked append-only ledger of financial mutations and access events
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleVerifyChain}>
          <ShieldCheck size={14} /> Verify Audit Hash Chain
        </Button>
      </div>

      {/* Verification Result Banner */}
      {verificationResult.tested && (
        <div
          className={`p-3.5 border text-xs font-medium flex items-center gap-3 ${
            verificationResult.isValid
              ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
              : 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
          }`}
        >
          {verificationResult.isValid ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <ShieldAlert size={18} className="shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {verificationResult.isValid
                ? 'Cryptographic Chain Integrity Confirmed'
                : 'Tamper Alert Detected'}
            </div>
            <div className="text-[11px] mt-0.5">{verificationResult.details}</div>
          </div>
        </div>
      )}

      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search by action, actor, or entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EF] border border-[#CCCCCC] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
          <span className="text-[11px] text-[#777777]">
            {filteredEvents.length} immutable events recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3">Mutation State</th>
                <th className="p-3">Block Hash (SHA-256)</th>
                <th className="p-3">Previous Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-[#777777]">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-semibold text-sm text-[#111111]">No Audit Events Recorded Yet</p>
                      <p className="text-xs text-[#888888]">
                        Every financial creation, approval, and journal posting will generate an immutable SHA-256 cryptographic audit record.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs text-[#555555] font-mono whitespace-nowrap">
                      {formatDateTime(ev.timestamp)}
                    </td>
                    <td className="p-3 text-xs font-semibold text-[#111111]">
                      {ev.actorName}
                    </td>
                    <td className="p-3 text-xs">
                      <span className="font-mono text-[11px] bg-[#F4F3EF] px-1.5 py-0.5 border border-[#E5E5E5]">
                        {ev.action}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-[#444444]">
                      {ev.entityType} ({ev.entityId.substring(0, 10)}...)
                    </td>
                    <td className="p-3 text-xs font-mono text-[#666666] max-w-xs truncate">
                      {ev.newState ? JSON.stringify(ev.newState) : '—'}
                    </td>
                    <td className="p-3 text-xs font-mono text-[#111111] font-medium">
                      {ev.hash}
                    </td>
                    <td className="p-3 text-xs font-mono text-[#888888]">
                      {ev.prevHash.substring(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </WebLayout>
  );
}
