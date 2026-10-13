'use client';

import React, { useState, useEffect } from 'react';
import { ControlLayout } from '@/components/control/ControlLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { ApprovalPolicy, UserRole } from '@/types';
import { rupeesToPaise } from '@/lib/accounting/engine';
import { CheckSquare, Plus, ShieldCheck } from 'lucide-react';

export default function ApprovalPoliciesPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Policy State
  const [name, setName] = useState('');
  const [minRupees, setMinRupees] = useState('');
  const [maxRupees, setMaxRupees] = useState('');
  const [approverRole, setApproverRole] = useState<UserRole>('approver');
  const [prohibitSelfApproval, setProhibitSelfApproval] = useState(true);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleCreatePolicy = () => {
    if (!name.trim() || !minRupees || !maxRupees) {
      alert('Please enter a policy rule title and threshold amounts.');
      return;
    }

    const orgId = storeState.organization?.id || 'org-default';
    globalDataStore.addApprovalPolicy({
      organizationId: orgId,
      name,
      minAmountPaise: rupeesToPaise(minRupees),
      maxAmountPaise: rupeesToPaise(maxRupees),
      approverRole,
      prohibitSelfApproval,
      isActive: true,
    });

    setName('');
    setMinRupees('');
    setMaxRupees('');
    setIsCreateOpen(false);
  };

  return (
    <ControlLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Approval Policies & Delegation of Authority
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Configure financial thresholds, approver levels, and mandatory separation of duties
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus size={13} /> Add Approval Rule
        </Button>
      </div>

      <div className="space-y-4">
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left financial-table">
              <thead>
                <tr>
                  <th className="p-3">Policy Name</th>
                  <th className="p-3 text-right">Min Threshold</th>
                  <th className="p-3 text-right">Max Threshold</th>
                  <th className="p-3">Required Approver Role</th>
                  <th className="p-3 text-center">Separation of Duties</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {storeState.approvalPolicies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-xs text-[#777777]">
                      No approval policies configured yet. Click &quot;Add Approval Rule&quot; to set financial threshold limits.
                    </td>
                  </tr>
                ) : (
                  storeState.approvalPolicies.map((pol) => (
                    <tr key={pol.id} className="hover:bg-[#FAFAF9]">
                      <td className="p-3 text-xs font-bold text-[#111111]">{pol.name}</td>
                      <td className="p-3 text-right num-tabular text-xs">
                        <CurrencyDisplay paise={pol.minAmountPaise} />
                      </td>
                      <td className="p-3 text-right num-tabular text-xs font-bold">
                        <CurrencyDisplay paise={pol.maxAmountPaise} />
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-mono text-[11px] uppercase bg-[#F4F3EF] px-1.5 py-0.5 border border-[#E5E5E5]">
                          {pol.approverRole.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center text-xs">
                        {pol.prohibitSelfApproval ? (
                          <span className="text-[#137333] font-semibold flex items-center justify-center gap-1">
                            <ShieldCheck size={14} /> Strict (No Self-Approval)
                          </span>
                        ) : (
                          <span className="text-gray-500">Permitted</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge status={pol.isActive ? 'Active' : 'Disabled'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Configure Financial Approval Rule"
        subtitle="Enforces spending limits and prevents unauthorized disbursements"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Policy Rule Title
            </label>
            <input
              type="text"
              value={name}
              placeholder="e.g. Director Sign-off Threshold"
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Min Amount (₹)
              </label>
              <input
                type="number"
                value={minRupees}
                placeholder="e.g. 10000"
                onChange={(e) => setMinRupees(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Max Amount (₹)
              </label>
              <input
                type="number"
                value={maxRupees}
                placeholder="e.g. 100000"
                onChange={(e) => setMaxRupees(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Designated Approver Authority
            </label>
            <select
              value={approverRole}
              onChange={(e) => setApproverRole(e.target.value as UserRole)}
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
            >
              <option value="approver">Department Manager / Approver</option>
              <option value="finance_admin">Finance Administrator</option>
              <option value="director">Director / Executive Management</option>
              <option value="owner">Organization Owner</option>
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={prohibitSelfApproval}
                onChange={(e) => setProhibitSelfApproval(e.target.checked)}
                className="accent-black"
              />
              <span className="font-semibold text-[#111111]">
                Enforce Separation of Duties (Prohibit Self-Approval)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreatePolicy}>
              Save Approval Rule
            </Button>
          </div>
        </div>
      </Modal>
    </ControlLayout>
  );
}
