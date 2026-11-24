'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Building, CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    companyName: 'Salman Enterprises Distribution Ltd.',
    brandName: 'Salman Enterprises',
    gstin: '29AAACA1234A1Z5',
    pan: 'AAACA1234A',
    registeredAddress: 'Nexus Technology Park, 4th Floor, Electronic City Phase 1',
    city: 'Bangalore',
    state: 'Karnataka',
    stateCode: '29',
    pincode: '560100',
    bankName: 'HDFC Bank Ltd.',
    bankAccountNumber: '50200088991122',
    bankIfsc: 'HDFC0001234',
    invoicePrefix: 'APX-INV-',
    quotationPrefix: 'APX-QTN-',
    defaultCreditDays: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const json = await res.json();
          if (json.data) setSettings(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSuccessMsg('Distribution platform settings saved successfully');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-[#23294E]">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" />
          Enterprise Distribution Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Company legal identity, Indian GST Rule 46 registration, corporate banking advice and invoice numbering sequences.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-400" />
            Legal Company & GST Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Company Legal Name</label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Brand Name</label>
              <input
                type="text"
                value={settings.brandName || ''}
                onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">GSTIN *</label>
              <input
                type="text"
                value={settings.gstin || ''}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={settings.pan || ''}
                onChange={(e) => setSettings({ ...settings, pan: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Registered Address</label>
              <input
                type="text"
                value={settings.registeredAddress || ''}
                onChange={(e) => setSettings({ ...settings, registeredAddress: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
              />
            </div>
          </div>
        </div>

        {/* Corporate Banking Details */}
        <div className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Wholesale Banking Advice (Printed on Invoices)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Bank Name</label>
              <input
                type="text"
                value={settings.bankName || ''}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Account Number</label>
              <input
                type="text"
                value={settings.bankAccountNumber || ''}
                onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">IFSC Code</label>
              <input
                type="text"
                value={settings.bankIfsc || ''}
                onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Sequence Numbers & Credit Policies */}
        <div className="p-5 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-xl space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Document Sequences & Credit SLA
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Tax Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoicePrefix || ''}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Quotation Prefix</label>
              <input
                type="text"
                value={settings.quotationPrefix || ''}
                onChange={(e) => setSettings({ ...settings, quotationPrefix: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Default Credit Terms (Days)</label>
              <input
                type="number"
                value={settings.defaultCreditDays || 15}
                onChange={(e) => setSettings({ ...settings, defaultCreditDays: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#10132A] border border-[#23294E] text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] text-white text-xs font-semibold shadow-lg shadow-purple-900/40 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
