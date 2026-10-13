'use client';

import React, { useState, useEffect } from 'react';
import { ControlLayout } from '@/components/control/ControlLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { globalDataStore } from '@/lib/store/dataStore';
import { ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import { UserRole } from '@/types';
import { UserPlus, Shield, Check, X } from 'lucide-react';

export default function ControlUsersPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<UserRole>('finance_admin');

  // Invite Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleInviteUser = () => {
    if (!fullName.trim() || !email.trim()) {
      alert('Please enter member name and email address.');
      return;
    }

    globalDataStore.addUser({
      fullName,
      email,
      role,
      department: department.trim() || 'General Operations',
    });

    setIsInviteOpen(false);
    setFullName('');
    setEmail('');
    setDepartment('');
  };

  const allPermissions = [
    'view_records',
    'create_drafts',
    'edit_drafts',
    'submit_transactions',
    'approve_transactions',
    'post_entries',
    'reverse_entries',
    'manage_documents',
    'view_reports',
    'export_financials',
    'manage_users',
    'change_settings',
  ];

  return (
    <ControlLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            User Directory & Access Administration
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Role-Based Access Control (RBAC) and least-privilege permission matrix
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)}>
          <UserPlus size={13} /> Invite Organization Member
        </Button>
      </div>

      {/* User Directory */}
      <Card title="Organization Members" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Full Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Department</th>
                <th className="p-3 text-center">Membership Status</th>
              </tr>
            </thead>
            <tbody>
              {storeState.users.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAFAF9]">
                  <td className="p-3 text-xs font-semibold text-[#111111]">
                    {u.fullName}
                  </td>
                  <td className="p-3 text-xs text-[#555555] font-mono">{u.email}</td>
                  <td className="p-3 text-xs">
                    <span className="font-mono text-[11px] uppercase px-1.5 py-0.5 bg-[#F4F3EF] border border-[#E5E5E5]">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-[#666666]">{u.department}</td>
                  <td className="p-3 text-center">
                    <Badge status="Active">Verified Member</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Permission Matrix */}
      <Card
        title="Granular RBAC Permission Matrix"
        subtitle="Enforces database Row Level Security and API boundary validation"
        headerAction={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666666]">Inspect Role:</span>
            <select
              value={selectedRoleForMatrix}
              onChange={(e) => setSelectedRoleForMatrix(e.target.value as UserRole)}
              className="bg-white border border-[#CCCCCC] p-1 text-xs outline-none focus:border-black font-semibold"
            >
              {Object.keys(ROLE_PERMISSIONS).map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Capability / Operation</th>
                <th className="p-3">Security Scope</th>
                <th className="p-3 text-center">Authorization Status</th>
              </tr>
            </thead>
            <tbody>
              {allPermissions.map((perm) => {
                const isAllowed = ROLE_PERMISSIONS[selectedRoleForMatrix].includes(perm as any);

                return (
                  <tr key={perm} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs font-mono font-medium text-[#111111]">
                      {perm}
                    </td>
                    <td className="p-3 text-xs text-[#666666]">
                      {perm.includes('post') || perm.includes('reverse')
                        ? 'Immutable General Ledger'
                        : perm.includes('approve')
                        ? 'Disbursement Workflow'
                        : perm.includes('users') || perm.includes('settings')
                        ? 'Control Centre Administrative'
                        : 'Standard Operating Data'}
                    </td>
                    <td className="p-3 text-center">
                      {isAllowed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#137333] font-bold">
                          <Check size={14} /> GRANTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#C5221F] font-bold">
                          <X size={14} /> RESTRICTED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Organization Member"
        subtitle="Sends secure credentials and assigns role-based permissions"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Member Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Full Name"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. member@company.com"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Role Assignment
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              >
                <option value="employee">Employee</option>
                <option value="approver">Approver / Manager</option>
                <option value="finance_admin">Finance Administrator</option>
                <option value="accountant">Accountant / CA</option>
                <option value="director">Director / Executive</option>
                <option value="auditor">Auditor (Read-Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                placeholder="e.g. Finance / Operations / IT"
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleInviteUser}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </ControlLayout>
  );
}
