import { describe, it, expect } from 'vitest';
import { preprocessReceiptImage } from '@/lib/cv/receiptCvProcessor';
import { parseReceiptText } from '@/lib/ocr/extractor';

describe('Computer Vision (OpenCV equivalent) & Optical Document Processing', () => {
  it('should gracefully handle SSR or empty image data without throwing', async () => {
    const result = await preprocessReceiptImage('');
    expect(result).toBeDefined();
    expect(result.processedDataUrl).toBe('');
    expect(typeof result.processingTimeMs).toBe('number');
  });

  it('should extract Indian GSTIN, invoice number, and amounts with high accuracy', () => {
    const sampleReceiptText = `
      ZAWR INDUSTRIES LLP
      GSTIN: 29AABCU9603R1Z7
      Tax Invoice No: INV-2026-9812
      Date: 14/10/2026
      
      Item 1: Office Equipment: 10,000.00
      Subtotal: 10,000.00
      CGST @ 9%: 900.00
      SGST @ 9%: 900.00
      Grand Total: 11,800.00
    `;

    const extracted = parseReceiptText(sampleReceiptText, 'invoice.jpg');
    expect(extracted.vendorGstin?.value).toBe('29AABCU9603R1Z7');
    expect(extracted.invoiceNumber.value).toBe('INV-2026-9812');
    expect(extracted.invoiceDate.value).toBe('2026-10-14');
    expect(extracted.grandTotalPaise.value).toBe(1180000); // Rs 11,800.00 in paise
    expect(extracted.subtotalPaise.value).toBe(1000000);   // Rs 10,000.00 in paise
    expect(extracted.cgstPaise?.value).toBe(90000);        // Rs 900.00 in paise
    expect(extracted.sgstPaise?.value).toBe(90000);        // Rs 900.00 in paise
    expect(extracted.totalTaxPaise?.value).toBe(180000);    // Rs 1,800.00 in paise
  });

  it('should classify categories accurately based on keywords', () => {
    const fuelBill = 'INDIAN OIL PETROL PUMP\nFuel Diesel: 2500.00\nTotal: 2500.00';
    const fuelExtracted = parseReceiptText(fuelBill);
    expect(fuelExtracted.categorySuggestion.value).toBe('Travel & Business Conveyance');

    const foodBill = 'SARAVANAA BHAVAN RESTAURANT\nLunch Dinner Meal: 650.00\nTotal: 650.00';
    const foodExtracted = parseReceiptText(foodBill);
    expect(foodExtracted.categorySuggestion.value).toBe('Meals & Client Entertainment');

    const softwareBill = 'AMAZON WEB SERVICES AWS CLOUD HOSTING\nTotal: 8400.00';
    const softwareExtracted = parseReceiptText(softwareBill);
    expect(softwareExtracted.categorySuggestion.value).toBe('Software & Cloud Infrastructure');
  });
});
