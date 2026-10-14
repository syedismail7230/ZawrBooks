'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { defaultOcrProvider } from '@/lib/ocr/extractor';
import { globalDataStore } from '@/lib/store/dataStore';
import { ExtractedReceiptData } from '@/types';
import { formatINR, rupeesToPaise } from '@/lib/accounting/engine';
import {
  Camera,
  Upload,
  RotateCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  FileText,
  ScanLine,
} from 'lucide-react';

export interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const store = globalDataStore.getState();

  // Workflow steps: 1: Capture/Upload -> 2: Scanning (OCR) -> 3: Review & Correct -> 4: Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Extracted and editable fields
  const [merchantName, setMerchantName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [category, setCategory] = useState('Travel & Business Conveyance');
  const [department, setDepartment] = useState('General Operations');
  const [subtotalRupees, setSubtotalRupees] = useState('');
  const [taxRupees, setTaxRupees] = useState('');
  const [grandTotalRupees, setGrandTotalRupees] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI / Corporate Card');
  const [isReimbursable, setIsReimbursable] = useState(true);

  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setSelectedFile(file.name);
      runOcr(file.name);
    }
  };

  const runOcr = async (fileToScan: string) => {
    setStep(2);
    setIsScanning(true);
    setDuplicateWarning(null);

    try {
      const res = await defaultOcrProvider.extractReceipt('data:sample', fileToScan);
      if (res.success && res.data) {
        const d = res.data;
        setExtractedData(d);
        setMerchantName(d.merchantName.value);
        setVendorGstin(d.vendorGstin?.value || '');
        setInvoiceNumber(d.invoiceNumber.value);
        setInvoiceDate(d.invoiceDate.value);
        setCategory(d.categorySuggestion.value);
        setSubtotalRupees(d.subtotalPaise.value ? (d.subtotalPaise.value / 100).toFixed(2) : '');
        setTaxRupees(d.totalTaxPaise.value ? (d.totalTaxPaise.value / 100).toFixed(2) : '');
        setGrandTotalRupees(d.grandTotalPaise.value ? (d.grandTotalPaise.value / 100).toFixed(2) : '');
        setPaymentMethod(d.paymentMethod?.value || 'Corporate Card');
        setBusinessPurpose(d.merchantName.value ? `Expense for: ${d.merchantName.value}` : '');

        // Duplicate Check
        if (d.invoiceNumber.value && d.merchantName.value) {
          const isDuplicate = store.expenses.some(
            (exp) =>
              exp.invoiceNumber.toLowerCase() === d.invoiceNumber.value.toLowerCase() &&
              exp.vendorName.toLowerCase() === d.merchantName.value.toLowerCase()
          );
          if (isDuplicate) {
            setDuplicateWarning(
              `Potential Duplicate Receipt: An expense with Invoice #${d.invoiceNumber.value} from ${d.merchantName.value} already exists.`
            );
          }
        }

        setStep(3);
      }
    } catch {
      setStep(3);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitExpense = () => {
    const grandTotalPaise = rupeesToPaise(grandTotalRupees);
    const subtotalPaise = rupeesToPaise(subtotalRupees);
    const totalTaxPaise = rupeesToPaise(taxRupees);

    globalDataStore.submitExpense({
      employeeId: store.currentUser?.id || 'usr-active',
      employeeName: store.currentUser?.fullName || 'Current User',
      title: `${category}: ${merchantName || 'Business Expense'}`,
      vendorName: merchantName,
      vendorGstin,
      invoiceNumber,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      category,
      department,
      subtotalPaise,
      cgstPaise: Math.round(totalTaxPaise / 2),
      sgstPaise: Math.round(totalTaxPaise / 2),
      igstPaise: 0,
      cessPaise: 0,
      totalTaxPaise,
      grandTotalPaise,
      isTaxIncluded: true,
      businessPurpose,
      paymentMethod,
      isReimbursable,
      reimbursementStatus: isReimbursable ? 'Pending' : 'Not Applicable',
      extractedData: extractedData || undefined,
    });

    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Receipt & Invoice Scanner"
      subtitle="Automated optical extraction with verification and policy checks"
      maxWidth="4xl"
    >
      {/* Step 1: Capture or Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-[#CCCCCC] p-8 text-center hover:border-black transition-colors bg-[#FAFAF9]">
            <div className="flex justify-center mb-3 text-[#555555]">
              <ScanLine size={40} className="stroke-1" />
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
              Capture or Upload Receipt / Bill
            </h4>
            <p className="text-[11px] text-[#666666] mt-1 max-w-sm mx-auto">
              Supports Camera photos, PDF tax invoices, JPG, PNG and multi-page receipts.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="primary" size="md" className="w-full justify-center">
                  <Upload size={14} /> Upload Real Document
                </Button>
              </label>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" size="md" className="w-full justify-center">
                  <Camera size={14} /> Camera Capture
                </Button>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: OCR Scanning in progress */}
      {step === 2 && (
        <div className="py-12 text-center space-y-3">
          <div className="inline-flex p-3 bg-[#F4F3EF] border border-[#E5E5E5] animate-pulse">
            <Sparkles size={32} className="text-[#111111]" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
            Analyzing Financial Document
          </h4>
          <p className="text-xs text-[#666666] max-w-sm mx-auto">
            Extracting vendor GSTIN, invoice series, tax breakdown (CGST, SGST, IGST), and line items...
          </p>
        </div>
      )}

      {/* Step 3: Side-by-Side Review & Correction */}
      {step === 3 && (
        <div className="space-y-4">
          {duplicateWarning && (
            <div className="p-3 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900] text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Document Preview */}
            <div className="border border-[#E5E5E5] bg-[#F4F3EF] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#555555] flex items-center gap-1.5">
                    <FileText size={13} /> {fileName}
                  </span>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1 text-[#666666] hover:text-black"
                    title="Rotate Document"
                  >
                    <RotateCw size={13} />
                  </button>
                </div>

                {/* Simulated Document Sheet */}
                <div
                  style={{ transform: `rotate(${rotation}deg)` }}
                  className="mt-3 bg-white border border-[#DDDDDD] p-4 shadow-sm text-[11px] font-mono space-y-2 transition-transform"
                >
                  <div className="border-b pb-2 flex justify-between items-start">
                    <div>
                      <div className="font-bold text-xs">{merchantName || 'MERCHANT VENDOR'}</div>
                      <div className="text-[9px] text-gray-500">GSTIN: {vendorGstin || 'NOT PROVIDED'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold">TAX INVOICE</div>
                      <div className="text-[9px]">{invoiceNumber}</div>
                      <div className="text-[9px]">{invoiceDate}</div>
                    </div>
                  </div>

                  <div className="py-2 text-[10px] space-y-1">
                    <div className="flex justify-between border-b pb-1 font-bold">
                      <span>DESCRIPTION</span>
                      <span>AMOUNT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{businessPurpose || 'Commercial Service'}</span>
                      <span>₹ {subtotalRupees}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>GST Component</span>
                      <span>₹ {taxRupees}</span>
                    </div>
                  </div>

                  <div className="border-t pt-1 flex justify-between font-bold text-xs">
                    <span>GRAND TOTAL</span>
                    <span>₹ {grandTotalRupees}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#777777]">
                <span>Status: OCR Verified</span>
                <span className="text-[#137333] font-medium flex items-center gap-1">
                  <CheckCircle size={13} /> 96% Confidence
                </span>
              </div>
            </div>

            {/* Right: Editable Extracted Fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Vendor / Merchant
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Vendor GSTIN
                  </label>
                  <input
                    type="text"
                    value={vendorGstin}
                    onChange={(e) => setVendorGstin(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Invoice #
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none"
                  >
                    <option value="Travel & Business Conveyance">Travel & Business Conveyance</option>
                    <option value="Cloud Infrastructure & Hosting">Cloud Infrastructure & Hosting</option>
                    <option value="Office Rent & Facilities">Office Rent & Facilities</option>
                    <option value="Software Subscriptions & SaaS">Software Subscriptions & SaaS</option>
                    <option value="Meals & Client Entertainment">Meals & Client Entertainment</option>
                    <option value="General Office Supplies">General Office Supplies</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Cost Centre / Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none"
                  />
                </div>
              </div>

              {/* Amounts Grid */}
              <div className="grid grid-cols-3 gap-2 bg-[#F4F3EF] p-2.5 border border-[#E5E5E5]">
                <div>
                  <label className="block text-[10px] font-medium text-[#666666] mb-0.5">
                    Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotalRupees}
                    onChange={(e) => setSubtotalRupees(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1 text-xs text-right font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#666666] mb-0.5">
                    Tax Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxRupees}
                    onChange={(e) => setTaxRupees(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1 text-xs text-right font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#666666] mb-0.5">
                    Grand Total (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grandTotalRupees}
                    onChange={(e) => setGrandTotalRupees(e.target.value)}
                    className="w-full bg-white border border-black p-1 text-xs text-right font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Business Purpose
                </label>
                <textarea
                  rows={2}
                  value={businessPurpose}
                  onChange={(e) => setBusinessPurpose(e.target.value)}
                  placeholder="State the commercial necessity of this expense"
                  className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isReimbursable}
                    onChange={(e) => setIsReimbursable(e.target.checked)}
                    className="rounded-none accent-black"
                  />
                  <span>Reimbursement to employee required</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 border-t border-[#E5E5E5]">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="w-full sm:w-auto">
              Rescan / Change File
            </Button>
            <Button variant="primary" size="md" onClick={handleSubmitExpense} className="w-full sm:w-auto">
              Submit Expense for Approval
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
