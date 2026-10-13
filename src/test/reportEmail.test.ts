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
      expect(html).toContain('2. Outbound Communications Log');
      expect(html).toContain('4. Action Items & Follow-up Tasks');
      expect(html).toContain('5. System Telemetry & Perimeter Defense');
      expect(html).toContain('Perimeter Defense Normal');
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
  });
});
