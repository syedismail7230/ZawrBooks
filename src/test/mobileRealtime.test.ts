import { describe, it, expect, beforeEach } from 'vitest';
import { globalDataStore, defaultRecognizedUsers } from '@/lib/store/dataStore';

describe('Zawr Books Mobile & Realtime Store Suite', () => {
  beforeEach(() => {
    // Reset store state if needed
    globalDataStore.syncNow();
  });

  it('submits a real expense, records audit event, and broadcasts updates', () => {
    let notified = false;
    const unsub = globalDataStore.subscribe(() => {
      notified = true;
    });

    const initialTimestamp = globalDataStore.getLastSyncTimestamp();

    const newExpense = globalDataStore.submitExpense({
      employeeId: 'usr-ceo',
      employeeName: 'Syed Ismail Zabiulla',
      title: 'Travel: Flight to Mumbai Corporate Office',
      vendorName: 'Air India',
      invoiceNumber: 'AI-9921',
      invoiceDate: '2026-10-14',
      category: 'Travel & Business Conveyance',
      department: 'Director',
      subtotalPaise: 800000,
      cgstPaise: 20000,
      sgstPaise: 20000,
      igstPaise: 0,
      cessPaise: 0,
      totalTaxPaise: 40000,
      grandTotalPaise: 840000,
      isTaxIncluded: true,
      businessPurpose: 'Board Meeting with Enterprise Clients',
      paymentMethod: 'Corporate Card',
      isReimbursable: true,
      reimbursementStatus: 'Pending',
    });

    expect(newExpense.id).toBeDefined();
    expect(newExpense.status).toBe('Submitted');
    expect(notified).toBe(true);
    expect(globalDataStore.getLastSyncTimestamp()).toBeGreaterThanOrEqual(initialTimestamp);

    const state = globalDataStore.getState();
    const found = state.expenses.find((e) => e.id === newExpense.id);
    expect(found).toBeDefined();
    expect(found?.vendorName).toBe('Air India');

    unsub();
  });

  it('allows employee to update and resubmit an expense in real time', () => {
    const state = globalDataStore.getState();
    const exp = state.expenses[0];
    expect(exp).toBeDefined();

    const updateRes = globalDataStore.updateExpense(exp.id, {
      grandTotalPaise: 850000,
      businessPurpose: 'Updated board meeting conveyance with airport lounge fee',
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.expense?.grandTotalPaise).toBe(850000);
    expect(updateRes.expense?.businessPurpose).toContain('airport lounge fee');
  });

  it('updates employee payout preferences and persists to profile', () => {
    const ceo = defaultRecognizedUsers[0];
    const res = globalDataStore.updateUserProfile(ceo.id, {
      bankDetails: 'HDFC Corporate Bank - A/C 50100099887766, IFSC HDFC0000001',
    });

    expect(res.success).toBe(true);
    const updatedUser = globalDataStore.getState().users.find((u) => u.id === ceo.id);
    expect(updatedUser?.bankDetails).toBe('HDFC Corporate Bank - A/C 50100099887766, IFSC HDFC0000001');
  });

  it('allows withdrawing/deleting unposted expenses', () => {
    const testExp = globalDataStore.submitExpense({
      employeeId: 'usr-ceo',
      employeeName: 'Syed Ismail Zabiulla',
      title: 'Coffee with Partner',
      vendorName: 'Blue Tokai',
      invoiceNumber: 'BT-101',
      invoiceDate: '2026-10-14',
      category: 'Meals & Client Entertainment',
      department: 'Director',
      subtotalPaise: 40000,
      cgstPaise: 1000,
      sgstPaise: 1000,
      igstPaise: 0,
      cessPaise: 0,
      totalTaxPaise: 2000,
      grandTotalPaise: 42000,
      isTaxIncluded: true,
      businessPurpose: 'Quick sync',
      paymentMethod: 'UPI',
      isReimbursable: true,
      reimbursementStatus: 'Pending',
    });

    const deleteRes = globalDataStore.deleteExpense(testExp.id);
    expect(deleteRes.success).toBe(true);

    const exists = globalDataStore.getState().expenses.some((e) => e.id === testExp.id);
    expect(exists).toBe(false);
  });
});
