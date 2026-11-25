'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUi } from '@/components/providers/UiProvider';
import { PageHeader, EmptyState, SkeletonCards } from '@/components/ui/EnterpriseUI';
import Modal from '@/components/Modal';
import { FileText, Download, Upload, Shield, CreditCard, Trash2, Plus } from 'lucide-react';

export default function EmployeeDocumentsPage() {
  const { toast, confirm } = useUi();
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [appointmentLetterUrl, setAppointmentLetterUrl] = useState('/api/employee/documents/appointment-letter');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{ title: string; category: string; file: File | null }>({
    title: '',
    category: 'EMPLOYMENT',
    file: null,
  });

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/documents');
      const data = await res.json();
      if (res.ok) {
        setPayslips(data.payslips || []);
        setDocuments(data.documents || []);
        if (data.appointmentLetterUrl) setAppointmentLetterUrl(data.appointmentLetterUrl);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.title.trim()) {
      toast.error('Please enter a document title and choose a file.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('category', form.category);
      fd.append('file', form.file);

      const res = await fetch('/api/employee/documents', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to upload document');
        return;
      }
      toast.success('Document securely added to your vault.');
      setForm({ title: '', category: 'EMPLOYMENT', file: null });
      setIsUploadOpen(false);
      await loadDocuments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    const ok = await confirm({
      title: 'Delete Document',
      message: `Remove "${title}" from your personal document vault?`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/employee/documents/${docId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Document removed.');
      await loadDocuments();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Could not remove document');
    }
  };

  if (loading) return <SkeletonCards count={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Documents & Payslips"
        subtitle="Access your official appointment letter, verified monthly payslips, and private employment records."
        eyebrow="Private Document Vault"
        actions={
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload Personal Document</span>
          </button>
        }
      />

      {/* Official Appointment Letter Card */}
      <div className="enterprise-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[#6538ED]/30 bg-[#F6F5FF]/70 dark:bg-[#191C3A]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#6538ED] text-white shadow">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Official Appointment &amp; Employment Letter</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
              Digitally generated from your verified employment, branch, shift, and reporting manager records.
            </p>
          </div>
        </div>
        <a
          href={appointmentLetterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5 shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Appointment PDF</span>
        </a>
      </div>

      {/* Payslips */}
      <div className="enterprise-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#12B886]" />
          <span>Salary Payslips ({payslips.length})</span>
        </h3>
        {payslips.length === 0 ? (
          <EmptyState
            title="No finalized payslips available yet"
            description="Once HR finalizes monthly payroll runs for your profile, downloadable PDF payslips will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {payslips.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between dark:border-slate-800"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Pay Period {p.month}/{p.year}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">{p.payslipNumber}</p>
                  <p className="text-xs font-bold text-[#12B886] mt-1">
                    Net ₹{Number(p.netSalary || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <a
                  href={p.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-[#6538ED]/30 bg-[#F6F5FF] px-3 py-1.5 text-xs font-bold text-[#6538ED] hover:bg-[#EDE9FE]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personal Uploaded Documents */}
      <div className="enterprise-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#6538ED]" />
          <span>Employment &amp; Verification Documents ({documents.length})</span>
        </h3>

        {documents.length === 0 ? (
          <EmptyState
            title="No custom documents uploaded"
            description="Upload personal verification IDs, tax forms, or signed HR documents (PDF, JPG, PNG)."
            actionLabel="Upload Document"
            onAction={() => setIsUploadOpen(true)}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{doc.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {doc.category.replace(/_/g, ' ')} • {doc.fileName} • {Math.max(1, Math.round((doc.size || 0) / 1024))} KB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5 text-[#6538ED]" />
                    <span>View / Download</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Personal HR Document"
        description="PDF, JPG, PNG or WebP up to 4.5MB. Accessible strictly to you and authorized HR."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., PAN Verification / Signed Policy"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="enterprise-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="enterprise-input"
            >
              <option value="EMPLOYMENT">Employment Record</option>
              <option value="ID_PROOF">ID Verification</option>
              <option value="TAX">Tax &amp; Declarations</option>
              <option value="POLICY">Policy Acknowledgment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select File *
            </label>
            <input
              type="file"
              required
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-[#F6F5FF] file:px-3 file:py-2 file:font-semibold file:text-[#6538ED]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? 'Uploading...' : 'Save Document'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
