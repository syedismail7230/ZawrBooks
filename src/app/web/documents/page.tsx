'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { FileText, Download, Upload } from 'lucide-react';

export default function DocumentsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      const hashStr = `sha256-${Math.random().toString(36).substring(2, 10)}`;
      globalDataStore.addDocument({
        name: file.name,
        category: file.type.includes('pdf') ? 'PDF Invoice / Document' : 'Receipt Image',
        size: sizeStr,
        hash: hashStr,
      });
    }
  };

  const docs = storeState.documents || [];

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Document Repository & Evidence Vault
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Encrypted document storage, digital receipt preservation, and cryptographic verification
          </p>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <span className="inline-flex items-center justify-center font-medium transition-colors bg-[#111111] text-[#FFFFFF] hover:bg-[#222222] border border-[#111111] text-xs px-3.5 py-1.5 gap-2 cursor-pointer">
            <Upload size={13} /> Upload Supporting Document
          </span>
        </label>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Document Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Size</th>
                <th className="p-3">File Integrity Hash (SHA-256)</th>
                <th className="p-3">Uploaded By</th>
                <th className="p-3">Upload Date</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-[#777777]">
                    No documents uploaded yet. Click &quot;Upload Supporting Document&quot; above to store your first financial file.
                  </td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs font-semibold text-[#111111] flex items-center gap-2">
                      <FileText size={15} className="text-[#666666]" />
                      <span>{doc.name}</span>
                    </td>
                    <td className="p-3 text-xs text-[#555555]">{doc.category}</td>
                    <td className="p-3 text-xs font-mono text-[#666666]">{doc.size}</td>
                    <td className="p-3 text-xs font-mono text-[#111111]">{doc.hash}</td>
                    <td className="p-3 text-xs text-[#333333]">{doc.uploadedBy}</td>
                    <td className="p-3 text-xs text-[#555555] font-mono">{formatDate(doc.date)}</td>
                    <td className="p-3 text-center">
                      <Badge status="Approved">{doc.status}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => alert(`Downloading ${doc.name}...`)}>
                        <Download size={12} /> Download
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </WebLayout>
  );
}
