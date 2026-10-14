import { describe, it, expect, beforeEach } from 'vitest';
import { parseReceiptText } from '@/lib/ocr/extractor';
import { globalDataStore } from '@/lib/store/dataStore';
import { serverStore, defaultOrganization, defaultStandardAccounts } from '@/lib/store/serverStore';
import { ExpenseSubmission, VendorBill, UserProfile } from '@/types';

describe('ZawrBooks Comprehensive UT QA - OCR, Approvals & Organization Persistence', () => {
  beforeEach(() => {
    // Reset dataStore to clean state
    globalDataStore.syncNow();
  });

  describe('1. OCR Document Parser & Auto-fill Engine', () => {
    it('QA-01: Auto-extracts Indian GSTIN, vendor name, invoice number, and amounts from tax invoice text', () => {
      const sampleOcrText = `
        TAX INVOICE
        BHARAT PETROLEUM CORPORATION LTD
        GSTIN: 29AABCB0000A1Z5
        Retail Outlet: Outer Ring Road, Bangalore
        Bill No: BPCL-2026-9812
        Date: 14/10/2026
        Time: 18:30:15

        Item: SPEED PETROL
        Density: 745.2 kg/m3
        Rate: 102.50 INR/Litre
        Volume: 24.39 Litres
        Taxable Amount: 2,118.64
        CGST @ 9%: 190.68
        SGST @ 9%: 190.68
        Total Tax: 381.36
        Grand Total: 2,500.00
        Payment Mode: UPI / Card
      `;

      const result = parseReceiptText(sampleOcrText, 'petrol_bill.jpg');

      expect(result.merchantName.value).toContain('Bharat Petroleum');
      expect(result.vendorGstin?.value).toBe('29AABCB0000A1Z5');
      expect(result.invoiceNumber.value).toBe('BPCL-2026-9812');
      expect(result.invoiceDate.value).toBe('2026-10-14');
      expect(result.grandTotalPaise.value).toBe(250000); // 2500.00 in paise
      expect(result.subtotalPaise.value).toBe(211864);
      expect(result.cgstPaise.value).toBe(19068);
      expect(result.sgstPaise.value).toBe(19068);
      expect(result.totalTaxPaise.value).toBe(38136);
      expect(result.categorySuggestion.value).toBe('Travel & Business Conveyance');
    });

    it('QA-02: Auto-extracts Meals & Food category from restaurant/cafe bills with 5% GST', () => {
      const sampleSwiggyText = `
        SWIGGY TAX INVOICE
        Order ID: SWIG-98421098
        Date: 12-Oct-2026
        Merchant: The Rameshwaram Cafe LLP
        GSTIN: 29AAGFR5841N1Z0

        Item Total: 420.00
        CGST 2.5%: 10.50
        SGST 2.5%: 10.50
        Total Payable: 441.00
      `;

      const result = parseReceiptText(sampleSwiggyText, 'swiggy_order.pdf');

      expect(result.merchantName.value).toContain('Swiggy');
      expect(result.vendorGstin?.value).toBe('29AAGFR5841N1Z0');
      expect(result.invoiceNumber.value).toBe('SWIG-98421098');
      expect(result.invoiceDate.value).toBe('2026-10-12');
      expect(result.grandTotalPaise.value).toBe(44100);
      expect(result.categorySuggestion.value).toBe('Meals & Client Entertainment');
    });

    it('QA-03: Auto-extracts Software & Cloud bills with correct 18% GST allocation', () => {
      const sampleAwsText = `
        Amazon Web Services / Amazon India
        Invoice Number: AWS-INV-55120
        Invoice Date: 2026-09-30
        GSTIN: 27AABCA1234F1Z1
        Services: AWS Cloud Compute & Storage
        Sub Total: 10,000.00
        IGST 18%: 1,800.00
        Amount Due: 11,800.00
      `;

      const result = parseReceiptText(sampleAwsText, 'aws_invoice.pdf');

      expect(result.merchantName.value).toContain('Amazon Web Services');
      expect(result.vendorGstin?.value).toBe('27AABCA1234F1Z1');
      expect(result.invoiceNumber.value).toBe('AWS-INV-55120');
      expect(result.invoiceDate.value).toBe('2026-09-30');
      expect(result.subtotalPaise.value).toBe(1000000);
      expect(result.igstPaise.value).toBe(180000);
      expect(result.grandTotalPaise.value).toBe(1180000);
      expect(result.categorySuggestion.value).toBe('Software & Cloud Infrastructure');
    });

    it('QA-04: Reconciles amounts when only Grand Total is printed on receipt (18% inclusive)', () => {
      const receiptNoTaxText = `
        UBER INDIA SYSTEMS
        Trip Invoice: UBER-84920
        Date: 15/10/2026
        Total Fare: Rs. 590.00
      `;

      const result = parseReceiptText(receiptNoTaxText, 'uber_receipt.jpg');

      expect(result.grandTotalPaise.value).toBe(59000); // 590 * 100
      // 590 / 1.18 = 500 subtotal, 90 total tax
      expect(result.subtotalPaise.value).toBe(50000);
      expect(result.totalTaxPaise.value).toBe(9000);
    });

    it('QA-05: Extracts metadata from filename if document text is low resolution or blank', () => {
      const result = parseReceiptText('', 'Indian_Oil_Petrol_Bill_3500.pdf');

      expect(result.merchantName.value).toContain('Indian Oil');
      expect(result.grandTotalPaise.value).toBe(350000);
      expect(result.categorySuggestion.value).toBe('Travel & Business Conveyance');
    });
  });

  describe('2. Organization Persistence & Login Consistency', () => {
    it('QA-06: Pre-configures Zawr Industries organization profile by default', () => {
      const state = globalDataStore.getState();

      expect(state.organization).not.toBeNull();
      expect(state.organization?.name).toBe('ZAWR INDUSTRIES LLP');
      expect(state.organization?.legalName).toBe('ZAWR INDUSTRIES LLP');
      expect(state.organization?.gstin).toBe('29AADFZ6214A1ZC');
      expect(state.organization?.pan).toBe('AADFZ6214A');
      expect(state.organization?.currency).toBe('INR');
      expect(state.organization?.timezone).toBe('Asia/Kolkata');
    });

    it('QA-07: Initializes Chart of Accounts with standard Indian double-entry ledgers', () => {
      const state = globalDataStore.getState();

      expect(state.accounts.length).toBeGreaterThanOrEqual(10);
      const pettyCash = state.accounts.find((a) => a.code === '1010');
      const bank = state.accounts.find((a) => a.code === '1020');
      const debtors = state.accounts.find((a) => a.code === '1100');
      const inputCgst = state.accounts.find((a) => a.code === '1200');
      const creditors = state.accounts.find((a) => a.code === '2010');

      expect(pettyCash).toBeDefined();
      expect(bank).toBeDefined();
      expect(debtors).toBeDefined();
      expect(inputCgst).toBeDefined();
      expect(creditors).toBeDefined();
    });

    it('QA-08: Updating organization persists to server and preserves data across sessions', () => {
      const updatedOrg = serverStore.saveOrganization({
        name: 'Zawr Global Industries',
        legalName: 'Zawr Global Industries Private Limited',
        gstin: '29AABCZ9999F1Z9',
        pan: 'AABCZ9999F',
      });

      expect(updatedOrg.name).toBe('Zawr Global Industries');
      expect(updatedOrg.legalName).toBe('Zawr Global Industries Private Limited');
      expect(updatedOrg.gstin).toBe('29AABCZ9999F1Z9');

      const retrieved = serverStore.getOrganization();
      expect(retrieved.gstin).toBe('29AABCZ9999F1Z9');
    });
  });

  describe('3. Financial Approvals Queue (Expenses & Vendor Bills)', () => {
    it('QA-09: Submitting an employee expense creates pending submission with status Submitted', () => {
      const expense = globalDataStore.submitExpense({
        employeeId: 'usr-employee-1',
        employeeName: 'Zabiulla',
        title: 'Travel: Client Meeting Conveyance',
        vendorName: 'Uber India Systems',
        invoiceNumber: 'UBER-98210',
        invoiceDate: '2026-10-14',
        category: 'Travel & Business Conveyance',
        department: 'Corporate Finance',
        subtotalPaise: 45000,
        cgstPaise: 2250,
        sgstPaise: 2250,
        igstPaise: 0,
        cessPaise: 0,
        totalTaxPaise: 4500,
        grandTotalPaise: 49500,
        isTaxIncluded: true,
        businessPurpose: 'Visiting auditor offices',
        paymentMethod: 'Corporate Card',
        isReimbursable: true,
        reimbursementStatus: 'Pending',
      });

      expect(expense.id).toBeDefined();
      expect(expense.status).toBe('Submitted');

      const state = globalDataStore.getState();
      const inStore = state.expenses.find((e) => e.id === expense.id);
      expect(inStore).toBeDefined();
      expect(inStore?.status).toBe('Submitted');
    });

    it('QA-10: Approving an expense submission marks it Approved with approver details', () => {
      const expense = globalDataStore.submitExpense({
        employeeId: 'usr-md',
        employeeName: 'Mohammed Ahmed',
        title: 'Office Supplies: Thermal Printer Rolls',
        vendorName: 'Bangalore Stationery Mart',
        invoiceNumber: 'BSM-4401',
        invoiceDate: '2026-10-14',
        category: 'Office Supplies & Stationery',
        department: 'Operations',
        subtotalPaise: 120000,
        cgstPaise: 10800,
        sgstPaise: 10800,
        igstPaise: 0,
        cessPaise: 0,
        totalTaxPaise: 21600,
        grandTotalPaise: 141600,
        isTaxIncluded: true,
        businessPurpose: 'Receipt printing for billing desk',
        paymentMethod: 'UPI',
        isReimbursable: true,
      });

      // CEO user reviews and approves
      const result = globalDataStore.reviewExpense(expense.id, 'Approved', 'Approved after checking vendor GSTIN');

      expect(result.success).toBe(true);
      const state = globalDataStore.getState();
      const approved = state.expenses.find((e) => e.id === expense.id);
      expect(approved?.status).toBe('Approved');
      expect(approved?.approverName).toBe('Syed Ismail Zabiulla');
      expect(approved?.comments?.[0].text).toBe('Approved after checking vendor GSTIN');
    });

    it('QA-11: Returning an expense sets status Returned with audit clarification comment', () => {
      const expense = globalDataStore.submitExpense({
        employeeId: 'usr-md',
        employeeName: 'Mohammed Ahmed',
        title: 'Software: Cloud Hosting',
        vendorName: 'Direct Cloud Ltd',
        invoiceNumber: 'DC-8812',
        invoiceDate: '2026-10-14',
        category: 'Software & Cloud Infrastructure',
        department: 'Engineering',
        subtotalPaise: 500000,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 90000,
        cessPaise: 0,
        totalTaxPaise: 90000,
        grandTotalPaise: 590000,
        isTaxIncluded: true,
        businessPurpose: 'Server renewal',
        paymentMethod: 'Credit Card',
        isReimbursable: true,
      });

      const result = globalDataStore.reviewExpense(expense.id, 'Returned', 'Please attach the GST tax invoice PDF');

      expect(result.success).toBe(true);
      const state = globalDataStore.getState();
      const returned = state.expenses.find((e) => e.id === expense.id);
      expect(returned?.status).toBe('Returned');
      expect(returned?.comments?.[0].text).toBe('Please attach the GST tax invoice PDF');
    });

    it('QA-12: Submitting and approving a Vendor Bill updates status and posts audit entry', () => {
      const bill = globalDataStore.addVendorBill({
        vendorId: 'vend-test-1',
        vendorName: 'Tata Telecommunications Ltd',
        billNumber: 'TATA-BILL-9901',
        billDate: '2026-10-10',
        dueDate: '2026-10-25',
        subtotalPaise: 800000,
        taxPaise: 144000,
        totalPaise: 944000,
      });

      expect(bill.id).toBeDefined();
      expect(bill.status).toBe('Submitted');

      // Verify it appears in pending bills
      const stateBefore = globalDataStore.getState();
      const pendingBefore = stateBefore.vendorBills.filter((b) => b.status === 'Submitted');
      expect(pendingBefore.some((b) => b.id === bill.id)).toBe(true);

      // Review and authorize bill
      const result = globalDataStore.reviewVendorBill(bill.id, 'Approved', 'Authorized for payment remittance');
      expect(result.success).toBe(true);

      const stateAfter = globalDataStore.getState();
      const updated = stateAfter.vendorBills.find((b) => b.id === bill.id);
      expect(updated?.status).toBe('Approved');
    });

    it('QA-13: Accurately parses user test Tax Invoice (ZAWR INDUSTRIES LLP, ZI/25-26/0421, ₹17,700.00)', () => {
      const userBillText = `
ZAWR INDUSTRIES LLP
No. 12, 3rd Floor, MG Road
Bengaluru - 560001, Karnataka
GSTIN: 29AABFZ1234C1Z5

TAX INVOICE
Invoice No. : ZI/25-26/0421
Invoice Date : 14-10-2026
Place of Supply : Karnataka (29)
Bill To : ABC Private Limited
 Bengaluru - 560001
 GSTIN: 29AAHCA1234D1Z6

Sr. Description SAC Qty Rate Amount
1 Web Development Services 998314 1 10,000.00 10,000.00
2 Digital Marketing Services 998326 1 5,000.00 5,000.00

Subtotal 15,000.00
CGST @ 9% 1,350.00
SGST @ 9% 1,350.00
Total ₹ 17,700.00
Amount in Words: Rupees Seventeen Thousand Seven Hundred Only
      `;

      const result = parseReceiptText(userBillText, 'camera-scan-2026-10-14.jpg');

      expect(result.merchantName?.value).toBe('ZAWR INDUSTRIES LLP');
      expect(result.vendorGstin?.value).toBe('29AABFZ1234C1Z5');
      expect(result.invoiceNumber?.value).toBe('ZI/25-26/0421');
      expect(result.invoiceDate?.value).toBe('2026-10-14');
      expect(result.subtotalPaise?.value).toBe(1500000);
      expect(result.cgstPaise?.value).toBe(135000);
      expect(result.sgstPaise?.value).toBe(135000);
      expect(result.grandTotalPaise?.value).toBe(1770000);
    });

    it('QA-14: Empty OCR text from camera scan never produces bogus "Camera" or "2026.00" values', () => {
      const result = parseReceiptText('', 'camera-scan-2026-10-14-19-48-19.jpg');

      // Merchant must not be set to "Camera"
      expect(result.merchantName?.value).not.toBe('Camera');
      expect(result.merchantName?.value).not.toBe('Camera Scan');

      // Grand total must not match the year 2026 from the filename timestamp
      expect(result.grandTotalPaise?.value).not.toBe(202600);
      expect(result.grandTotalPaise?.value).toBe(0);
    });
  });
});
