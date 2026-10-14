'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { globalDataStore } from '@/lib/store/dataStore';
import { rupeesToPaise } from '@/lib/accounting/engine';
import { Plus, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function BudgetsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [costCentre, setCostCentre] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleAddBudget = () => {
    if (!name || !amountRupees) return;
    globalDataStore.addBudget({
      name,
      costCentre: costCentre || 'General Operations',
      budgetPaise: rupeesToPaise(amountRupees),
    });
    setName('');
    setCostCentre('');
    setAmountRupees('');
    setIsAddOpen(false);
  };

  const handleDispatchBudgetAlerts = async () => {
    setIsDispatching(true);
    setAlertNotice(null);
    try {
      const items = storeState.budgets || [];
      const criticalOrWarning = items.filter((b) => {
        const pct = b.budgetPaise > 0 ? (b.actualPaise / b.budgetPaise) * 100 : 0;
        return pct >= 80;
      });

      if (criticalOrWarning.length === 0) {
        setAlertNotice({
          type: 'success',
          text: 'All cost centre budgets are currently within normal spending limits (<80% threshold).',
        });
        setIsDispatching(false);
        return;
      }

      for (const b of criticalOrWarning) {
        const pct = Math.round((b.actualPaise / b.budgetPaise) * 100);
        await fetch('/api/email/business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'BUDGET_ALERT',
            payload: {
              budget: b,
              percent: pct,
            },
          }),
        });
      }

      setAlertNotice({
        type: 'success',
        text: `Dispatched budget variance alert emails for ${criticalOrWarning.length} cost centre(s) to admin@zawrindustries.com.`,
      });
      setIsDispatching(false);
    } catch (err: any) {
      setIsDispatching(false);
      setAlertNotice({ type: 'error', text: err.message });
    }
  };

  const budgetItems = storeState.budgets || [];

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Cost Centres & Budget vs Actuals
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Departmental spending monitoring against approved fiscal budget allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isDispatching}
            onClick={handleDispatchBudgetAlerts}
          >
            <Mail size={13} /> {isDispatching ? 'Auditing...' : 'Email Budget Alerts to Admin'}
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus size={13} /> Allocate Budget
          </Button>
        </div>
      </div>

      {alertNotice && (
        <div
          className={`p-3 border text-xs font-medium flex items-center justify-between ${
            alertNotice.type === 'error'
              ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
              : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{alertNotice.text}</span>
          </div>
          <button onClick={() => setAlertNotice(null)} className="font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Expense Category</th>
                <th className="p-3">Cost Centre / Dept</th>
                <th className="p-3 text-right">Allocated Budget (₹)</th>
                <th className="p-3 text-right">Actual Spent (₹)</th>
                <th className="p-3 text-right">Remaining (₹)</th>
                <th className="p-3 w-40">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {budgetItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-[#777777]">
                    No cost centre budgets allocated yet. Click &quot;Allocate Budget&quot; to configure your spending targets.
                  </td>
                </tr>
              ) : (
                budgetItems.map((item) => {
                  const remaining = item.budgetPaise - item.actualPaise;
                  const percent =
                    item.budgetPaise > 0
                      ? Math.round((item.actualPaise / item.budgetPaise) * 100)
                      : 0;

                  return (
                    <tr key={item.id} className="hover:bg-[#FAFAF9]">
                      <td className="p-3 text-xs font-semibold text-[#111111]">{item.name}</td>
                      <td className="p-3 text-xs text-[#555555]">{item.costCentre}</td>
                      <td className="p-3 text-right num-tabular text-xs">
                        <CurrencyDisplay paise={item.budgetPaise} />
                      </td>
                      <td className="p-3 text-right num-tabular text-xs font-bold">
                        <CurrencyDisplay paise={item.actualPaise} />
                      </td>
                      <td className="p-3 text-right num-tabular text-xs text-[#137333]">
                        <CurrencyDisplay paise={remaining} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[#E5E5E5] h-2">
                            <div
                              className={`h-2 ${percent > 90 ? 'bg-[#C5221F]' : 'bg-[#111111]'}`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[#666666]">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Allocate Cost Centre Budget"
        subtitle="Define spending limits for operational categories"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cloud Infrastructure"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Cost Centre / Department
            </label>
            <input
              type="text"
              value={costCentre}
              onChange={(e) => setCostCentre(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Budget Limit (₹)
            </label>
            <input
              type="number"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleAddBudget}>
              Save Budget
            </Button>
          </div>
        </div>
      </Modal>
    </WebLayout>
  );
}
