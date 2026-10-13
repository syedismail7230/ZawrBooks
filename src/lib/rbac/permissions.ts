import { ApprovalPolicy, ExpenseSubmission, Permission, UserProfile, UserRole } from '@/types';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
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
  ],
  director: [
    'view_records',
    'submit_transactions',
    'approve_transactions',
    'manage_documents',
    'view_reports',
    'export_financials',
  ],
  finance_admin: [
    'view_records',
    'create_drafts',
    'edit_drafts',
    'submit_transactions',
    'post_entries',
    'reverse_entries',
    'manage_documents',
    'view_reports',
    'export_financials',
  ],
  accountant: [
    'view_records',
    'create_drafts',
    'edit_drafts',
    'submit_transactions',
    'manage_documents',
    'view_reports',
    'export_financials',
  ],
  approver: [
    'view_records',
    'submit_transactions',
    'approve_transactions',
    'manage_documents',
  ],
  employee: [
    'create_drafts',
    'edit_drafts',
    'submit_transactions',
    'manage_documents',
  ],
  auditor: [
    'view_records',
    'view_reports',
    'export_financials',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(permission) : false;
}

/**
 * Validates whether a user can approve a given expense submission based on policies.
 * Enforces separation of duties (AC-04: user cannot approve their own submission).
 */
export function evaluateExpenseApproval(
  user: UserProfile,
  expense: ExpenseSubmission,
  policies: ApprovalPolicy[]
): {
  canApprove: boolean;
  reason?: string;
} {
  // Check permission
  if (!hasPermission(user.role, 'approve_transactions')) {
    return {
      canApprove: false,
      reason: `Role '${user.role}' does not possess expense approval privileges.`,
    };
  }

  // Separation of duties rule (AC-04)
  if (expense.employeeId === user.id) {
    return {
      canApprove: false,
      reason: 'Separation of Duties violation: A user cannot approve their own submission.',
    };
  }

  // Find matching policy by amount and department/category
  const matchingPolicy = policies.find((p) => {
    if (!p.isActive) return false;
    const amountInRange =
      expense.grandTotalPaise >= p.minAmountPaise &&
      expense.grandTotalPaise <= p.maxAmountPaise;
    const deptMatch = !p.department || p.department === expense.department;
    const catMatch = !p.category || p.category === expense.category;
    return amountInRange && deptMatch && catMatch;
  });

  if (matchingPolicy) {
    if (matchingPolicy.prohibitSelfApproval && expense.employeeId === user.id) {
      return {
        canApprove: false,
        reason: 'Policy explicitly prohibits self-approval.',
      };
    }
  }

  return { canApprove: true };
}
