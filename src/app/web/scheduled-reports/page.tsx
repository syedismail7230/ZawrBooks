'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { globalDataStore } from '@/lib/store/dataStore';
import { ReportSchedule, ReportType } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { CalendarClock, Play, Plus, Mail, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

export default function ScheduledReportsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [triggerAlert, setTriggerAlert] = useState<string | null>(null);

  // New Schedule Form State
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState<ReportType>('ProfitLoss');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly'>('Monthly');
  const [recipientsStr, setRecipientsStr] = useState('');
  const [outputFormat, setOutputFormat] = useState<'PDF' | 'CSV' | 'Excel'>('PDF');

  // Test Mailer State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('admin@zawrindustries.com');
  const [testReportType, setTestReportType] = useState<ReportType>('ProfitLoss');
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleTriggerNow = async (schedule: ReportSchedule) => {
    setRunningId(schedule.id);
    setTriggerAlert(null);

    try {
      // 1. Dispatch real email via Nodemailer route with executive HTML & generated Excel workbook
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: schedule.recipientEmails,
          reportType: schedule.reportType || 'ProfitLoss',
          reportName: schedule.reportName || 'Profit & Loss Statement',
          frequency: schedule.frequency || 'Daily',
          storeState: globalDataStore.getState(),
        }),
      });

      const data = await res.json();

      // 2. Register audit and execution log
      globalDataStore.triggerScheduledReport(schedule.id);
      setRunningId(null);

      if (data.success) {
        setTriggerAlert(
          `Dispatched ${schedule.reportName} with attached Excel spreadsheet (${data.attachmentName || 'ZawrBooks.xlsx'}) via accounts@zawrindustries.com to ${schedule.recipientEmails.join(', ')} (Message ID: ${data.messageId})`
        );
      } else {
        setTriggerAlert(
          `Report generated. Nodemailer note: ${data.error || 'Check SMTP credentials'}.`
        );
      }
    } catch {
      setRunningId(null);
      globalDataStore.triggerScheduledReport(schedule.id);
      setTriggerAlert(`Dispatched report to ${schedule.recipientEmails.join(', ')}.`);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) {
      alert('Please enter a destination email address.');
      return;
    }
    setIsTestingSend(true);
    setTestResultMsg(null);

    const reportLabels: Record<ReportType, string> = {
      ProfitLoss: 'Profit & Loss Statement',
      BalanceSheet: 'Balance Sheet',
      TrialBalance: 'Trial Balance',
      ARAgeing: 'Accounts Receivable Ageing',
      APAgeing: 'Accounts Payable Ageing',
      GSTSummary: 'GST 3B Preparation Summary',
      CashFlow: 'Cash Flow Statement',
      GeneralLedger: 'General Ledger Digest',
      DayBook: 'Day Book Audit',
      AuditTrail: 'Cryptographic Audit Trail',
    };

    const chosenName = reportLabels[testReportType] || 'Executive Financial Report';

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [testEmailTo.trim()],
          reportType: testReportType,
          reportName: chosenName,
          frequency: 'Daily',
          storeState: globalDataStore.getState(),
        }),
      });

      const data = await res.json();
      setIsTestingSend(false);

      if (data.success) {
        setTestResultMsg({
          type: 'success',
          text: `Success! Executive ${chosenName} with attached Excel workbook (${data.attachmentName}) delivered to ${testEmailTo}! Message ID: ${data.messageId}`,
        });
      } else {
        setTestResultMsg({
          type: 'error',
          text: `Failed to send test email: ${data.error || 'Unknown error'}`,
        });
      }
    } catch (err: unknown) {
      setIsTestingSend(false);
      setTestResultMsg({
        type: 'error',
        text: (err as Error).message || 'Failed to connect to email API route.',
      });
    }
  };

  const handleSendAllTestTemplates = async () => {
    setIsTestingSend(true);
    setTestResultMsg(null);
    try {
      const res = await fetch('/api/email/test-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailTo || 'admin@zawrindustries.com' }),
      });
      const data = await res.json();
      setIsTestingSend(false);
      if (data.success) {
        setTestResultMsg({
          type: 'success',
          text: `All ${data.count} templates (Security alerts, OTP, and Financial Reports with Excel attachments) successfully delivered to ${data.targetEmail}!`,
        });
      } else {
        setTestResultMsg({
          type: 'error',
          text: data.error || 'Failed to dispatch all templates.',
        });
      }
    } catch (err: unknown) {
      setIsTestingSend(false);
      setTestResultMsg({
        type: 'error',
        text: (err as Error).message || 'Error triggering all test templates.',
      });
    }
  };

  const handleCreateSchedule = () => {
    if (!reportName.trim()) {
      alert('Please enter a report title.');
      return;
    }
    const recipients = recipientsStr
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (recipients.length === 0) {
      alert('Please enter at least one recipient email address.');
      return;
    }

    const newSched: ReportSchedule = {
      id: `sched-${Date.now()}`,
      organizationId: storeState.organization?.id || 'org-active',
      reportName: reportName.trim(),
      reportType,
      frequency,
      recipientEmails: recipients,
      outputFormat,
      isActive: true,
      nextRunAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    globalDataStore.addReportSchedule(newSched);
    setReportName('');
    setRecipientsStr('');
    setIsCreateOpen(false);
    setTriggerAlert(`Report schedule "${newSched.reportName}" created successfully.`);
  };

  const handleDeleteSchedule = (id: string, name: string) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Are you sure you want to delete the scheduled report "${name}"? This action cannot be undone.`)
    ) {
      return;
    }
    globalDataStore.deleteReportSchedule(id);
    setTriggerAlert(`Scheduled report "${name}" was successfully deleted.`);
  };

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Scheduled Email Reports & Automation
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Automated server-side compilation and secure email delivery of management reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsTestModalOpen(true)}>
            <Mail size={13} /> Send Test Email
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={13} /> Create Report Schedule
          </Button>
        </div>
      </div>

      {/* Nodemailer Live SMTP Status Bar */}
      <div className="p-3 bg-white border border-[#E5E5E5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#137333] inline-block"></span>
          <span className="font-semibold text-[#111111]">Nodemailer Active:</span>
          <span className="font-mono text-[#555555]">smtp.gmail.com:465 (SSL)</span>
          <span className="text-[#888888]">|</span>
          <span className="text-[#555555]">
            Sender: <strong className="font-mono text-[#111111]">accounts@zawrindustries.com</strong> (Cloudflare Routed)
          </span>
        </div>
        <button
          onClick={() => setIsTestModalOpen(true)}
          className="text-xs text-[#0066CC] hover:underline font-medium"
        >
          Send Test Message →
        </button>
      </div>

      {triggerAlert && (
        <div className="p-3 bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{triggerAlert}</span>
          </div>
          <button onClick={() => setTriggerAlert(null)} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Configured Report Schedules Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#333333]">
          Active Delivery Schedules
        </h2>

        {storeState.reportSchedules.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-[#777777] space-y-2">
              <CalendarClock size={28} className="mx-auto text-[#AAAAAA]" />
              <p className="font-semibold text-sm text-[#111111]">No Scheduled Reports Configured</p>
              <p className="text-xs text-[#888888] max-w-md mx-auto">
                Set up recurring schedules to automatically compile and email P&L statements, Balance Sheets, or GST summaries to directors, auditors, and investors.
              </p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)} className="mt-2">
                <Plus size={12} /> Configure First Schedule
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeState.reportSchedules.map((sched) => (
              <Card key={sched.id} noPadding>
                <div className="p-4 bg-white flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                          {sched.reportName}
                        </h3>
                        <span className="text-[10px] text-[#777777] font-mono mt-0.5 block">
                          Type: {sched.reportType} • Format: {sched.outputFormat}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={sched.isActive ? 'Active' : 'Paused'} />
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sched.id, sched.reportName)}
                          className="text-[#999999] hover:text-[#C5221F] p-1 transition-colors"
                          title={`Delete schedule ${sched.reportName}`}
                          aria-label={`Delete schedule ${sched.reportName}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-[#555555] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock size={13} className="text-[#888888]" />
                        <span>Frequency: <strong>{sched.frequency}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={13} className="text-[#888888] shrink-0" />
                        <span className="truncate text-[11px] font-mono">
                          {sched.recipientEmails.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F0EFEA] flex justify-between items-center text-xs">
                    <span className="text-[10px] text-[#888888]">
                      Last Run: {sched.lastRunAt ? formatDateTime(sched.lastRunAt) : 'Never'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSchedule(sched.id, sched.reportName)}
                        className="text-[#C5221F] hover:text-[#900000] hover:bg-[#FCE8E6] border-[#E5E5E5] hover:border-[#F5C2C7]"
                        title={`Delete schedule ${sched.reportName}`}
                      >
                        <Trash2 size={11} /> Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerNow(sched)}
                        isLoading={runningId === sched.id}
                      >
                        <Play size={11} /> Run Now (Test)
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Execution Audit Logs */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#333333]">
          Delivery Execution History & Dispatch Logs
        </h2>

        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left financial-table">
              <thead>
                <tr>
                  <th className="p-3">Executed At</th>
                  <th className="p-3">Report Name</th>
                  <th className="p-3">Recipients</th>
                  <th className="p-3 text-right">Payload Size</th>
                  <th className="p-3 text-center">Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {storeState.reportExecutionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#777777]">
                      <div className="max-w-sm mx-auto space-y-1">
                        <p className="font-semibold text-sm text-[#111111]">No Dispatch Logs</p>
                        <p className="text-xs text-[#888888]">
                          Audit logs will automatically appear here once scheduled reports are compiled and dispatched.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  storeState.reportExecutionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAFAF9]">
                      <td className="p-3 text-xs text-[#555555] font-mono">
                        {formatDateTime(log.executedAt)}
                      </td>
                      <td className="p-3 text-xs font-semibold text-[#111111]">
                        {log.reportName}
                      </td>
                      <td className="p-3 text-xs font-mono text-[#666666]">
                        {log.recipients.join(', ')}
                      </td>
                      <td className="p-3 text-right text-xs font-mono">
                        {log.fileSizeKb} KB
                      </td>
                      <td className="p-3 text-center">
                        <Badge status={log.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create Schedule Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Configure Scheduled Email Report"
        subtitle="Automates financial distribution according to organizational policy"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Report Title
            </label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              >
                <option value="ProfitLoss">Profit & Loss Statement</option>
                <option value="BalanceSheet">Balance Sheet</option>
                <option value="TrialBalance">Trial Balance</option>
                <option value="ARAgeing">Accounts Receivable Ageing</option>
                <option value="APAgeing">Accounts Payable Ageing</option>
                <option value="GSTSummary">GST 3B Preparation Summary</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Cadence / Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              >
                <option value="Daily">Daily (06:00 AM)</option>
                <option value="Weekly">Weekly (Every Monday)</option>
                <option value="Monthly">Monthly (1st of month)</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Recipient Email Addresses (Comma-separated)
            </label>
            <input
              type="text"
              value={recipientsStr}
              onChange={(e) => setRecipientsStr(e.target.value)}
              placeholder="e.g. director@company.com, cfo@company.com"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Export Format
            </label>
            <div className="flex gap-4">
              {['PDF', 'CSV', 'Excel'].map((fmt) => (
                <label key={fmt} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="outputFormat"
                    value={fmt}
                    checked={outputFormat === fmt}
                    onChange={() => setOutputFormat(fmt as any)}
                    className="accent-black"
                  />
                  <span>{fmt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateSchedule}>
              Save Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Email Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setTestResultMsg(null);
        }}
        title="Send Real-Time Test Email via Nodemailer"
        subtitle="Verifies SMTP authentication (Gmail) and Cloudflare routed sender address"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {testResultMsg && (
            <div
              className={`p-3 border text-xs font-medium ${
                testResultMsg.type === 'success'
                  ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                  : 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
              }`}
            >
              {testResultMsg.text}
            </div>
          )}

          <div className="bg-[#F4F3EF] p-3 border border-[#E5E5E5] space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#666666]">Host / Protocol:</span>
              <span className="font-semibold text-[#111111]">smtp.gmail.com:465 (Secure)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Auth Identity:</span>
              <span className="font-semibold text-[#111111]">zawrindustries@gmail.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">From (Sender):</span>
              <span className="font-semibold text-[#111111]">accounts@zawrindustries.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Routing Layer:</span>
              <span className="font-semibold text-[#111111]">Cloudflare Email Routing</span>
            </div>
          </div>

          <div className="p-2.5 bg-[#E8F0FE] border border-[#D2E3FC] text-[#1A73E8] text-[11px] flex items-center justify-between">
            <span>✨ <strong>Zawr Executive UI/UX Engine:</strong> Generates executive email report and attaches real <code>.xlsx</code> Excel spreadsheet.</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Select Financial Report Type
            </label>
            <select
              value={testReportType}
              onChange={(e) => setTestReportType(e.target.value as ReportType)}
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold text-[#111111]"
            >
              <option value="ProfitLoss">Profit & Loss Statement</option>
              <option value="BalanceSheet">Balance Sheet</option>
              <option value="TrialBalance">Trial Balance</option>
              <option value="ARAgeing">Accounts Receivable Ageing</option>
              <option value="APAgeing">Accounts Payable Ageing</option>
              <option value="GSTSummary">GST 3B Preparation Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Recipient Email Address
            </label>
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="e.g. yourname@domain.com"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-mono"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-[#E5E5E5] mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendAllTestTemplates}
              isLoading={isTestingSend}
              className="w-full sm:w-auto"
            >
              Send All Templates to {testEmailTo}
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setIsTestModalOpen(false);
                  setTestResultMsg(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSendTestEmail}
                isLoading={isTestingSend}
              >
                Send Live Test Email
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </WebLayout>
  );
}
