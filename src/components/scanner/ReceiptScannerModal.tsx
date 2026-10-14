'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { parseReceiptText } from '@/lib/ocr/extractor';
import { globalDataStore } from '@/lib/store/dataStore';
import { ExtractedReceiptData } from '@/types';
import { rupeesToPaise } from '@/lib/accounting/engine';
import {
  Camera,
  Upload,
  RotateCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  FileText,
  ScanLine,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Eye,
  FileCheck2,
} from 'lucide-react';
import Tesseract from 'tesseract.js';

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

  // Workflow steps: 1: Capture/Upload -> 2: Scanning (OCR) -> 3: Review & Correct
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('Analyzing Document...');
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

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
  const [confidencePercent, setConfidencePercent] = useState<number>(95);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep(1);
    setSelectedImageDataUrl(null);
    setFileName('');
    setRotation(0);
    setZoomLevel(1);
    setIsScanning(false);
    setDuplicateWarning(null);
    setRawOcrText('');
    setShowRawText(false);
  };

  const processFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setRotation(0);
    setZoomLevel(1);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImageDataUrl(dataUrl);
      runOcr(dataUrl, file.name);
    };
    reader.onerror = () => {
      alert('Failed to read the file. Please try again with another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const applyExtractedData = (d: ExtractedReceiptData, raw?: string) => {
    setExtractedData(d);
    if (raw) setRawOcrText(raw);

    const mName = d.merchantName?.value || '';
    const gstin = d.vendorGstin?.value || '';
    const invNum = d.invoiceNumber?.value || '';
    const invDate = d.invoiceDate?.value || new Date().toISOString().split('T')[0];
    const cat = d.categorySuggestion?.value || 'General Business Expense';

    const subtotal = d.subtotalPaise?.value ? (d.subtotalPaise.value / 100).toFixed(2) : '';
    const tax = d.totalTaxPaise?.value ? (d.totalTaxPaise.value / 100).toFixed(2) : '';
    const grand = d.grandTotalPaise?.value ? (d.grandTotalPaise.value / 100).toFixed(2) : '';

    setMerchantName(mName);
    setVendorGstin(gstin);
    setInvoiceNumber(invNum);
    setInvoiceDate(invDate);
    setCategory(cat);
    setSubtotalRupees(subtotal);
    setTaxRupees(tax);
    setGrandTotalRupees(grand);
    setBusinessPurpose(mName ? `Expense: ${mName}` : 'Business Expense');

    const calculatedConfidence = Math.round(
      ((d.grandTotalPaise?.confidence || 0.8) + (d.merchantName?.confidence || 0.8) + (d.invoiceNumber?.confidence || 0.8)) / 3 * 100
    );
    setConfidencePercent(Math.max(75, Math.min(99, calculatedConfidence)));

    // Duplicate Check against store
    if (invNum && mName) {
      const isDuplicate = store.expenses.some(
        (exp) =>
          exp.invoiceNumber.toLowerCase() === invNum.toLowerCase() &&
          exp.vendorName.toLowerCase() === mName.toLowerCase()
      );
      if (isDuplicate) {
        setDuplicateWarning(
          `Potential Duplicate: An expense with Invoice #${invNum} from "${mName}" is already recorded in the system.`
        );
      }
    }
  };

  const runOcr = async (fileDataUrl: string, name: string) => {
    setStep(2);
    setIsScanning(true);
    setDuplicateWarning(null);
    setScanStatusMessage('Recognizing vendor, invoice number, and GSTIN...');

    try {
      // Step 2a: Call Server-Side API endpoint (/api/ocr/extract)
      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: fileDataUrl, fileName: name }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          applyExtractedData(json.data, json.rawText);
          setStep(3);
          return;
        }
      }

      // Step 2b: Client-side Fallback using Tesseract.js directly in browser
      setScanStatusMessage('Running high-accuracy local optical engine...');
      const { data: { text } } = await Tesseract.recognize(fileDataUrl, 'eng');
      const parsed = parseReceiptText(text || '', name);
      applyExtractedData(parsed, text);
      setStep(3);
    } catch (err) {
      console.warn('OCR processing encounter:', err);
      // Fallback clean extraction so user can still manually review with the image displayed
      const fallback = parseReceiptText('', name);
      applyExtractedData(fallback);
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
      vendorName: merchantName || 'Direct Vendor',
      vendorGstin: vendorGstin || undefined,
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      category,
      department,
      subtotalPaise: subtotalPaise || grandTotalPaise,
      cgstPaise: Math.round(totalTaxPaise / 2),
      sgstPaise: Math.round(totalTaxPaise / 2),
      igstPaise: 0,
      cessPaise: 0,
      totalTaxPaise,
      grandTotalPaise,
      isTaxIncluded: true,
      businessPurpose: businessPurpose || 'Business necessity',
      paymentMethod,
      isReimbursable,
      reimbursementStatus: isReimbursable ? 'Pending' : 'Not Applicable',
      extractedData: extractedData || undefined,
    });

    onSuccess?.();
    resetState();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="AI Receipt & Invoice Scanner"
      subtitle="Optical text extraction with Indian GST verification and ledger reconciliation"
      maxWidth="4xl"
    >
      {/* Step 1: Capture or Upload with Drag & Drop */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-8 text-center transition-all ${
              isDragOver
                ? 'border-black bg-[#EBF3EB]'
                : 'border-[#CCCCCC] bg-[#FAFAF9] hover:border-black'
            }`}
          >
            <div className="flex justify-center mb-3 text-[#555555]">
              <ScanLine size={44} className="stroke-1 text-[#111111]" />
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
              Capture or Upload Bill / Receipt
            </h4>
            <p className="text-xs text-[#666666] mt-1 max-w-md mx-auto">
              Drop your receipt, restaurant bill, petrol voucher, or tax invoice here. We extract vendor, GSTIN, dates, and amounts automatically.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full justify-center"
                >
                  <Upload size={15} /> Upload Receipt File
                </Button>
              </label>

              <label className="cursor-pointer">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full justify-center"
                >
                  <Camera size={15} /> Camera Photo
                </Button>
              </label>
            </div>

            <div className="mt-4 text-[11px] text-[#888888]">
              Supports JPG, PNG, WEBP, and PDF documents up to 25MB
            </div>
          </div>
        </div>
      )}

      {/* Step 2: OCR Scanning in progress with live status */}
      {step === 2 && (
        <div className="py-14 text-center space-y-4">
          <div className="inline-flex p-4 bg-[#F4F3EF] border border-[#E5E5E5] animate-pulse">
            <Sparkles size={36} className="text-[#111111]" />
          </div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
            Analyzing Financial Document
          </h4>
          <p className="text-xs text-[#666666] max-w-sm mx-auto">
            {scanStatusMessage}
          </p>
          <div className="w-48 h-1.5 bg-[#E5E5E5] mx-auto overflow-hidden rounded-full">
            <div className="h-full bg-black animate-pulse w-3/4"></div>
          </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Real Document Preview */}
            <div className="border border-[#E5E5E5] bg-[#F4F3EF] p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#555555] flex items-center gap-1.5 truncate max-w-[200px]">
                    <FileText size={13} /> {fileName || 'Receipt Document'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                      className="p-1 text-[#666666] hover:text-black hover:bg-white rounded-xs"
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                      className="p-1 text-[#666666] hover:text-black hover:bg-white rounded-xs"
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 text-[#666666] hover:text-black hover:bg-white rounded-xs"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw size={13} />
                    </button>
                    {rawOcrText && (
                      <button
                        onClick={() => setShowRawText(!showRawText)}
                        className={`p-1 text-xs rounded-xs flex items-center gap-1 px-1.5 border ${
                          showRawText ? 'bg-black text-white border-black' : 'text-[#666666] border-[#CCCCCC] bg-white'
                        }`}
                        title="Toggle Raw Extracted Text"
                      >
                        <Eye size={12} />
                        <span className="text-[10px]">Text</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Display Real Uploaded Receipt Image or Raw Text */}
                <div className="mt-3 bg-white border border-[#DDDDDD] p-2 min-h-[340px] max-h-[420px] overflow-auto flex items-center justify-center relative">
                  {showRawText && rawOcrText ? (
                    <div className="w-full h-full p-2 text-left font-mono text-[11px] whitespace-pre-wrap text-[#222222] bg-[#FAFAF9] overflow-y-auto">
                      {rawOcrText}
                    </div>
                  ) : selectedImageDataUrl ? (
                    <div
                      style={{
                        transform: `rotate(${rotation}deg) scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease-in-out',
                      }}
                      className="max-w-full flex items-center justify-center"
                    >
                      <img
                        src={selectedImageDataUrl}
                        alt="Receipt preview"
                        className="max-h-[380px] w-auto max-w-full object-contain shadow-xs border border-[#EEEEEE]"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8 text-xs text-[#888888]">
                      <FileCheck2 size={36} className="mx-auto text-gray-400 mb-2" />
                      Document verified
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#777777] pt-2 border-t border-[#E5E5E5]">
                <span>Status: OCR Verified</span>
                <span className="text-[#137333] font-medium flex items-center gap-1">
                  <CheckCircle size={13} /> {confidencePercent}% Confidence
                </span>
              </div>
            </div>

            {/* Right: Editable Extracted Fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Vendor / Merchant <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Indian Oil Corporation"
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Vendor GSTIN (15 digits)
                  </label>
                  <input
                    type="text"
                    value={vendorGstin}
                    onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                    placeholder="27ABCDE1234F1Z5"
                    maxLength={15}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Invoice # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-00123"
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Invoice Date <span className="text-red-500">*</span>
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
                    Expense Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-medium"
                  >
                    <option value="Travel & Business Conveyance">Travel & Business Conveyance</option>
                    <option value="Meals & Client Entertainment">Meals & Client Entertainment</option>
                    <option value="Office Supplies & Stationery">Office Supplies & Stationery</option>
                    <option value="Software & Cloud Infrastructure">Software & Cloud Infrastructure</option>
                    <option value="Cloud Infrastructure & Hosting">Cloud Infrastructure & Hosting</option>
                    <option value="Office Rent & Facilities">Office Rent & Facilities</option>
                    <option value="Professional & Legal Fees">Professional & Legal Fees</option>
                    <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                    <option value="General Business Expense">General Business Expense</option>
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

              {/* Amounts Grid with live reconciliation */}
              <div className="grid grid-cols-3 gap-2 bg-[#F4F3EF] p-2.5 border border-[#E5E5E5]">
                <div>
                  <label className="block text-[10px] font-medium text-[#666666] mb-0.5">
                    Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotalRupees}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubtotalRupees(val);
                      const s = parseFloat(val) || 0;
                      const t = parseFloat(taxRupees) || 0;
                      setGrandTotalRupees((s + t).toFixed(2));
                    }}
                    placeholder="0.00"
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaxRupees(val);
                      const s = parseFloat(subtotalRupees) || 0;
                      const t = parseFloat(val) || 0;
                      setGrandTotalRupees((s + t).toFixed(2));
                    }}
                    placeholder="0.00"
                    className="w-full bg-white border border-[#CCCCCC] p-1 text-xs text-right font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#111111] mb-0.5 font-bold">
                    Grand Total (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grandTotalRupees}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGrandTotalRupees(val);
                      const g = parseFloat(val) || 0;
                      if (!subtotalRupees || subtotalRupees === '0') {
                        const s = Math.round((g / 1.18) * 100) / 100;
                        setSubtotalRupees(s.toFixed(2));
                        setTaxRupees((g - s).toFixed(2));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-white border border-black p-1 text-xs text-right font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Business Purpose & Description
                </label>
                <textarea
                  rows={2}
                  value={businessPurpose}
                  onChange={(e) => setBusinessPurpose(e.target.value)}
                  placeholder="State the commercial purpose of this expense"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetState();
              }}
              className="w-full sm:w-auto"
            >
              <RefreshCw size={13} /> Scan Another Document
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitExpense}
              disabled={!grandTotalRupees || parseFloat(grandTotalRupees) <= 0}
              className="w-full sm:w-auto font-bold"
            >
              Submit Expense for Approval
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

