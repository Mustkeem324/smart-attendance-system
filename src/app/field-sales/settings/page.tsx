'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Camera,
  CreditCard,
  Clock,
} from 'lucide-react';

export default function FieldSalesSettingsPage() {
  const [settings, setSettings] = useState<any>({
    defaultGeofenceRadiusMeters: 100,
    minGpsAccuracyMeters: 25,
    requireShopPhotoOnVisit: true,
    requireCustomerProofOnDelivery: true,
    autoDeductStockOnVerification: true,
    allowPartialPaymentOnDelivery: true,
    maxAllowedLineDiscountPercent: 15,
    workingHoursStart: '08:00',
    workingHoursEnd: '20:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sales/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/sales/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setFeedback('Field sales configuration saved successfully.');
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Field Sales &amp; Distribution Settings
            </h1>
            <span className="rounded-full bg-[#5428E8]/10 px-2.5 py-0.5 text-xs font-bold text-[#5428E8]">
              System Rules
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default shop geofence parameters, verification policies, and inventory deduction workflows
          </p>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-semibold text-[#5428E8]">
          {feedback}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Geofence & GPS Rules */}
        <div className="rounded-3xl border border-[#E6E8F2] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5428E8]/10 text-[#5428E8]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">GPS &amp; Geofencing Rules</h2>
              <p className="text-[11px] text-slate-400">Haversine radius validation parameters for shop check-in</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Default Geofence Radius (Meters)</label>
              <input
                type="number"
                value={settings.defaultGeofenceRadiusMeters}
                onChange={(e) => setSettings({ ...settings, defaultGeofenceRadiusMeters: parseInt(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
              />
              <p className="mt-1 text-[10px] text-slate-400">Stores created without custom radius use this standard boundary.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Minimum GPS Accuracy (Meters)</label>
              <input
                type="number"
                value={settings.minGpsAccuracyMeters}
                onChange={(e) => setSettings({ ...settings, minGpsAccuracyMeters: parseInt(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
              />
              <p className="mt-1 text-[10px] text-slate-400">Readings with degraded accuracy above this are flagged for audit.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Photographic Proof & Verification Policy */}
        <div className="rounded-3xl border border-[#E6E8F2] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Evidence &amp; Verification Automation</h2>
              <p className="text-[11px] text-slate-400">Requirements for delivery submission and stock movement triggers</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireShopPhotoOnVisit}
                onChange={(e) => setSettings({ ...settings, requireShopPhotoOnVisit: e.target.checked })}
                className="h-4 w-4 rounded text-[#5428E8] focus:ring-[#5428E8]"
              />
              <div>
                <span className="font-bold text-slate-800">Require Shop-Front Photo on Check-in</span>
                <p className="text-[10px] text-slate-400">Enforces camera capture before representative can start order entry.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoDeductStockOnVerification}
                onChange={(e) => setSettings({ ...settings, autoDeductStockOnVerification: e.target.checked })}
                className="h-4 w-4 rounded text-[#5428E8] focus:ring-[#5428E8]"
              />
              <div>
                <span className="font-bold text-slate-800">Automated Warehouse Stock Deduction</span>
                <p className="text-[10px] text-slate-400">Automatically decrease warehouse on-hand stock immediately upon manager approval.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowPartialPaymentOnDelivery}
                onChange={(e) => setSettings({ ...settings, allowPartialPaymentOnDelivery: e.target.checked })}
                className="h-4 w-4 rounded text-[#5428E8] focus:ring-[#5428E8]"
              />
              <div>
                <span className="font-bold text-slate-800">Allow Partial Payments &amp; Credit Sales</span>
                <p className="text-[10px] text-slate-400">Separates delivery invoice value from collected amounts, tracking outstanding balances.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-[#5428E8] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#5428E8]/20 hover:bg-[#431fbd] transition"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
