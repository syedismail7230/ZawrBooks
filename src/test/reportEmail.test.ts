import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  compileFinancialReportEmail,
  generateFinancialReportHtml,
  generateFinancialReportExcel,
} from '@/lib/email/reportEmailGenerator';
import { globalDataStore } from '@/lib/store/dataStore';
import { ReportType } from '@/types';

describe('Zawr Industries Executive Email & Excel Report Generator', () => {
  const reportTypes: ReportType[] = [
    'ProfitLoss',
    'BalanceSheet',
    'TrialBalance',
    'ARAgeing',
    'APAgeing',
    'GSTSummary',
  ];

  for (const reportType of reportTypes) {
    it(`generates valid executive HTML email for report type: ${reportType}`, () => {
      const storeState = globalDataStore.getState();
      const html = generateFinancialReportHtml({
        reportType,
        reportName: `${reportType} Statement`,
        frequency: 'Daily',
        storeState,
        recipientEmail: 'accounts@zawrindustries.com',
      });

      // Verify branding and structure matching UI/UX spec
      expect(html).toContain('ZAWR');
      expect(html).toContain('INDUSTRIES');
      expect(html).toContain('EXECUTIVE FINANCIAL REPORT');
      expect(html).toContain('Dear <strong>Finance, Accounts & Executive Leadership Team</strong>');
      expect(html).toContain('1. ');
      expect(html).toContain('2. Financial Performance & Visual Trajectory');
      expect(html).toContain('MAX. ACHIEVED ↑');
      expect(html).toContain('3. Working Capital & Liquid Cash Reserves');
      expect(html).toContain('4. Statutory Tax & Accounting Invariant Assurance');
      expect(html).toContain('Double-Entry Equilibrium Invariant');
      expect(html).toContain('zawrindustries.com');
      expect(html).toContain('accounts@zawrindustries.com');
    });

    it(`generates valid .xlsx Excel workbook attachment for report type: ${reportType}`, () => {
      const storeState = globalDataStore.getState();
      const excel = generateFinancialReportExcel({
        reportType,
        reportName: `${reportType} Statement`,
        frequency: 'Daily',
        storeState,
      });

      expect(excel.filename).toMatch(new RegExp(`^ZawrBooks_${reportType}_\\d{4}-\\d{2}-\\d{2}\\.xlsx$`));
      expect(excel.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(excel.buffer).toBeInstanceOf(Buffer);
      expect(excel.buffer.length).toBeGreaterThan(1000);

      // Verify workbook is readable by XLSX
      const parsedWb = XLSX.read(excel.buffer, { type: 'buffer' });
      expect(parsedWb.SheetNames.length).toBeGreaterThan(0);
      const sheet = parsedWb.Sheets[parsedWb.SheetNames[0]];
      expect(sheet).toBeDefined();
    });
  }

  it('compiles ready-to-dispatch payload with HTML content and Excel buffer attachment', () => {
    const storeState = globalDataStore.getState();
    const compiled = compileFinancialReportEmail({
      reportType: 'ProfitLoss',
      reportName: 'Profit & Loss Statement',
      frequency: 'Daily',
      recipientEmail: 'accounts@zawrindustries.com',
      storeState,
    });

    expect(compiled.subject).toContain('[ZAWR EXECUTIVE]');
    expect(compiled.subject).toContain('Profit & Loss Statement');
    expect(compiled.htmlContent).toContain('ZAWR');
    expect(compiled.attachment).toBeDefined();
    expect(compiled.attachment.filename).toContain('ZawrBooks_ProfitLoss_');
    expect(compiled.attachment.content).toBeInstanceOf(Buffer);
    expect(compiled.attachment.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(compiled.attachments).toBeDefined();
    expect(compiled.attachments?.some((a) => a.cid === 'zawr-brand-logo')).toBe(true);
    expect(compiled.htmlContent).toContain('cid:zawr-brand-logo');
  });

  it('allows adding and deleting report delivery schedules with audit logging', () => {
    const testSched = {
      id: `test-sched-${Date.now()}`,
      organizationId: 'org-test',
      reportName: 'Weekly Executive Cashflow',
      reportType: 'CashFlow' as const,
      frequency: 'Weekly' as const,
      recipientEmails: ['cfo@zawrindustries.com'],
      outputFormat: 'PDF' as const,
      isActive: true,
      nextRunAt: new Date().toISOString(),
    };

    globalDataStore.addReportSchedule(testSched);
    const stateAfterAdd = globalDataStore.getState();
    expect(stateAfterAdd.reportSchedules.some((s) => s.id === testSched.id)).toBe(true);

    const deleteRes = globalDataStore.deleteReportSchedule(testSched.id);
    expect(deleteRes.success).toBe(true);

    const stateAfterDelete = globalDataStore.getState();
    expect(stateAfterDelete.reportSchedules.some((s) => s.id === testSched.id)).toBe(false);

    // Verify audit event was logged
    expect(
      stateAfterDelete.auditEvents.some(
        (a) => a.action === 'DELETE_REPORT_SCHEDULE' && a.entityId === testSched.id
      )
    ).toBe(true);
  });
});
