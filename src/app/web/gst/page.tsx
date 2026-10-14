'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { FileSpreadsheet, Download, Info } from 'lucide-react';
import { exportReportToExcel, exportReportToCsv } from '@/lib/reports/reportGenerator';

export default function GstTaxPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  // Compute Output GST from posted Invoices
  const outwardTaxablePaise = storeState.invoices.reduce((s, i) => s + i.subtotalPaise, 0);
  const outputCgstPaise = storeState.invoices.reduce((s, i) => s + i.cgstPaise, 0);
  const outputSgstPaise = storeState.invoices.reduce((s, i) => s + i.sgstPaise, 0);
  const outputIgstPaise = storeState.invoices.reduce((s, i) => s + i.igstPaise, 0);
  const totalOutputGstPaise = outputCgstPaise + outputSgstPaise + outputIgstPaise;

  // Compute Input GST (ITC) from posted bills/expenses
  const inputCgstPaise = storeState.accounts.find((a) => a.code === '1200')?.balancePaise || 0;
  const inputSgstPaise = storeState.accounts.find((a) => a.code === '1210')?.balancePaise || 0;
  const inputIgstPaise = storeState.accounts.find((a) => a.code === '1220')?.balancePaise || 0;
  const totalItcPaise = inputCgstPaise + inputSgstPaise + inputIgstPaise;

  const netGstPayablePaise = Math.max(0, totalOutputGstPaise - totalItcPaise);

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            GST Summary & Filing Preparation (GSTR-3B)
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Output liability on outward supplies reconciled against eligible Input Tax Credit (ITC)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportReportToExcel('GST_3B', storeState)} title="Download formatted GSTR-3B Excel workbook">
            <FileSpreadsheet size={13} /> Export GSTR-3B Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReportToCsv('GST_3B', storeState)} title="Download GSTR-3B CSV">
            <Download size={13} /> Export CSV
          </Button>
        </div>
      </div>

      <div className="p-3 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900] text-xs flex items-center gap-2">
        <Info size={16} className="shrink-0" />
        <span>
          Compliance Note: This is an internal accounting and filing-preparation report compiled from posted books. Final returns must be verified before electronic submission on the GSTN portal.
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total Output GST Liability (Sales)">
          <div className="text-xl font-bold text-[#111111] mt-1">
            <CurrencyDisplay paise={totalOutputGstPaise} />
          </div>
          <span className="text-[11px] text-[#666666] mt-1 block">
            Taxable Outward Turnover: {outwardTaxablePaise > 0 ? <CurrencyDisplay paise={outwardTaxablePaise} /> : '₹ 0.00'}
          </span>
        </Card>

        <Card title="Eligible Input Tax Credit (ITC)">
          <div className="text-xl font-bold text-[#137333] mt-1">
            <CurrencyDisplay paise={totalItcPaise} />
          </div>
          <span className="text-[11px] text-[#666666] mt-1 block">
            Aggregated CGST, SGST, IGST from verified vendor invoices
          </span>
        </Card>

        <Card title="Net Cash Tax Payable to GSTN">
          <div className="text-xl font-bold text-[#C5221F] mt-1">
            <CurrencyDisplay paise={netGstPayablePaise} />
          </div>
          <span className="text-[11px] text-[#666666] mt-1 block">
            Net tax payable after offsetting eligible ITC pool
          </span>
        </Card>
      </div>

      {/* Detailed GSTR-3B Table */}
      <Card title="GSTR-3B Table 3.1 & Table 4 Component Breakdown" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Nature of Supplies / Tax Pool</th>
                <th className="p-3 text-right">Integrated Tax (IGST)</th>
                <th className="p-3 text-right">Central Tax (CGST)</th>
                <th className="p-3 text-right">State/UT Tax (SGST)</th>
                <th className="p-3 text-right">Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[#FAFAF9]">
                <td className="p-3 text-xs font-bold text-[#111111]">
                  (a) Outward Taxable Supplies (Output Liability)
                </td>
                <td className="p-3 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={outputIgstPaise} />
                </td>
                <td className="p-3 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={outputCgstPaise} />
                </td>
                <td className="p-3 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={outputSgstPaise} />
                </td>
                <td className="p-3 text-right num-tabular text-xs font-bold">
                  <CurrencyDisplay paise={totalOutputGstPaise} />
                </td>
              </tr>
              <tr className="hover:bg-[#FAFAF9]">
                <td className="p-3 text-xs font-bold text-[#137333]">
                  (b) Eligible Input Tax Credit Available (ITC)
                </td>
                <td className="p-3 text-right num-tabular text-xs text-[#137333]">
                  <CurrencyDisplay paise={inputIgstPaise} />
                </td>
                <td className="p-3 text-right num-tabular text-xs text-[#137333]">
                  <CurrencyDisplay paise={inputCgstPaise} />
                </td>
                <td className="p-3 text-right num-tabular text-xs text-[#137333]">
                  <CurrencyDisplay paise={inputSgstPaise} />
                </td>
                <td className="p-3 text-right num-tabular text-xs font-bold text-[#137333]">
                  <CurrencyDisplay paise={totalItcPaise} />
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-[#F4F3EF] border-t-2 border-black font-bold">
              <tr>
                <td className="p-3 uppercase text-xs">Net Cash Tax Payable</td>
                <td className="p-3 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={Math.max(0, outputIgstPaise - inputIgstPaise)} />
                </td>
                <td className="p-3 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={Math.max(0, outputCgstPaise - inputCgstPaise)} />
                </td>
                <td className="p-3 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={Math.max(0, outputSgstPaise - inputSgstPaise)} />
                </td>
                <td className="p-3 text-right num-tabular text-xs text-[#C5221F]">
                  <CurrencyDisplay paise={netGstPayablePaise} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </WebLayout>
  );
}
