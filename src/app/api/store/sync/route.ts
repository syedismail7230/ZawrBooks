import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/store/serverStore';

export async function GET() {
  try {
    const state = serverStore.getStoreState();
    return NextResponse.json({
      success: true,
      state,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload, state } = body;

    if (action === 'SUBMIT_EXPENSE' && payload) {
      serverStore.submitExpense(payload);
    } else if (action === 'ADD_VENDOR_BILL' && payload) {
      serverStore.addVendorBill(payload);
    } else if (action === 'REVIEW_EXPENSE' && payload) {
      const { id, decision, approver, comment } = payload;
      serverStore.reviewExpense(id, decision, approver, comment);
    } else if (action === 'REVIEW_VENDOR_BILL' && payload) {
      const { id, decision, approver, comment } = payload;
      serverStore.reviewVendorBill(id, decision, approver, comment);
    } else if (action === 'SET_ORGANIZATION' && payload) {
      serverStore.saveOrganization(payload);
    } else if (state) {
      // Merge client collections with server collections (union by id, newest first)
      const current = serverStore.getStoreState();
      
      const mergeById = <T extends { id: string }>(serverList: T[], clientList: T[] = []): T[] => {
        const map = new Map<string, T>();
        for (const item of serverList) {
          if (item?.id) map.set(item.id, item);
        }
        for (const item of clientList) {
          if (item?.id) map.set(item.id, item);
        }
        return Array.from(map.values());
      };

      const updated = serverStore.saveStoreState({
        organization: state.organization ? serverStore.saveOrganization(state.organization) : current.organization,
        expenses: mergeById(current.expenses, state.expenses),
        vendorBills: mergeById(current.vendorBills, state.vendorBills),
        invoices: mergeById(current.invoices, state.invoices),
        customers: mergeById(current.customers, state.customers),
        vendors: mergeById(current.vendors, state.vendors),
        accounts: (state.accounts && state.accounts.length > 0) ? state.accounts : current.accounts,
      });

      return NextResponse.json({
        success: true,
        state: updated,
      });
    }

    const updatedState = serverStore.getStoreState();
    return NextResponse.json({
      success: true,
      state: updatedState,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
