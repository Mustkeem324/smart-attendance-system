'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Bell,
  Clock,
  Save,
  CheckCircle2,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { useUi } from '@/components/providers/UiProvider';
import { SkeletonCards } from '@/components/ui/EnterpriseUI';

interface OrgProfile {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
}

interface WorkspaceSettings {
  defaultGeofenceRadiusMeters: number;
  minGpsAccuracyMeters: number;
  workStartTime: string;
  gracePeriodMinutes: number;
  requireSelfieOnPunch: boolean;
  strictGeofenceEnforcement: boolean;
  mockLocationDetection: boolean;
  notifyLateArrivals: boolean;
  notifyLeaveRequests: boolean;
  notifyLowStock: boolean;
  dateFormat: string;
  timezone: string;
}

export default function SettingsPage() {
  const { toast } = useUi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [org, setOrg] = useState<OrgProfile>({
    id: '',
    name: 'Salman Enterprises',
    code: '',
    email: '',
    phone: '',
    address: '',
  });

  const [settings, setSettings] = useState<WorkspaceSettings>({
    defaultGeofenceRadiusMeters: 75,
    minGpsAccuracyMeters: 30,
    workStartTime: '09:30',
    gracePeriodMinutes: 15,
    requireSelfieOnPunch: true,
    strictGeofenceEnforcement: true,
    mockLocationDetection: true,
    notifyLateArrivals: true,
    notifyLeaveRequests: true,
    notifyLowStock: true,
    dateFormat: 'DD MMM YYYY',
    timezone: 'Asia/Kolkata',
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.organization) {
        setOrg({
          id: data.organization.id,
          name: data.organization.name || '',
          code: data.organization.code || '',
          email: data.organization.email || '',
          phone: data.organization.phone || '',
          address: data.organization.address || '',
        });
        if (data.settings) setSettings(data.settings);
      } else {
        toast.error(data.error || 'Unable to load workspace settings');
      }
    } catch {
      toast.error('Failed to connect to workspace configuration service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization: org, settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not persist settings');
      } else {
        if (data.organization) setOrg((prev) => ({ ...prev, ...data.organization }));
        if (data.settings) setSettings(data.settings);
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        toast.success('Enterprise configuration updated and saved.');
      }
    } catch {
      toast.error('Network error while saving configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCards count={2} />
        <SkeletonCards count={2} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Workspace Administration &amp; Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure organization profile, geofence verification thresholds, attendance policies, and alert routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {lastSavedAt && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved at {lastSavedAt}
            </span>
          )}
          <button
            type="button"
            onClick={loadSettings}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reload
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#6538ED]/25 transition disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Company Profile */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6538ED]/10 text-[#6538ED]">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Organization Profile</h2>
            <p className="text-[11px] text-slate-400">Primary corporate identity displayed across portals and exports</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Organization Code
            </label>
            <input
              type="text"
              disabled
              value={org.code}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-mono text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Official Contact Email *
            </label>
            <input
              type="email"
              required
              value={org.email}
              onChange={(e) => setOrg({ ...org, email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Corporate Phone
            </label>
            <input
              type="text"
              value={org.phone}
              onChange={(e) => setOrg({ ...org, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Headquarters Address
            </label>
            <input
              type="text"
              value={org.address}
              onChange={(e) => setOrg({ ...org, address: e.target.value })}
              placeholder="Street, city, state, postal code"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Geofence & Attendance Policies */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-white/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Location &amp; Geofence Policies
              </h2>
              <p className="text-[11px] text-slate-400">Default perimeter radii (50m–100m recommended) &amp; GPS precision</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Geofence Radius (meters)
              </label>
              <select
                value={settings.defaultGeofenceRadiusMeters}
                onChange={(e) =>
                  setSettings({ ...settings, defaultGeofenceRadiusMeters: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value={50}>50m (Strict Office Entrance)</option>
                <option value={75}>75m (Balanced Standard)</option>
                <option value={100}>100m (Campus &amp; Warehouse)</option>
                <option value={150}>150m (Large Logistics Yard)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Allowed GPS Error (±meters)
              </label>
              <input
                type="number"
                min={5}
                max={250}
                value={settings.minGpsAccuracyMeters}
                onChange={(e) =>
                  setSettings({ ...settings, minGpsAccuracyMeters: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Standard Shift Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="time"
                  value={settings.workStartTime}
                  onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Late Grace Period (minutes)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={settings.gracePeriodMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Security & Notification Preferences */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-white/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Verification Controls &amp; Alerts
              </h2>
              <p className="text-[11px] text-slate-400">Attendance fraud safeguards &amp; operational alerts</p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-white/10 text-xs">
            {[
              {
                key: 'requireSelfieOnPunch',
                title: 'Require Live Photo Capture on Check-In',
                desc: 'Prompts webcam verification before recording attendance.',
              },
              {
                key: 'strictGeofenceEnforcement',
                title: 'Strict Geofence Perimeter Check',
                desc: 'Flags or holds check-ins outside authorized office boundaries.',
              },
              {
                key: 'mockLocationDetection',
                title: 'Location Integrity Screening',
                desc: 'Flags anomalous GPS coordinates and accuracy discrepancies for review.',
              },
              {
                key: 'notifyLateArrivals',
                title: 'Late Arrival Escalation Alerts',
                desc: 'Notify supervisors when shift grace window is exceeded.',
              },
              {
                key: 'notifyLeaveRequests',
                title: 'Leave & Exception Approval Alerts',
                desc: 'Route new employee leave applications directly to managers.',
              },
              {
                key: 'notifyLowStock',
                title: 'Low Warehouse Stock Notifications',
                desc: 'Alert operations managers when SKUs fall below threshold.',
              },
            ].map((toggle) => (
              <label key={toggle.key} className="flex items-center justify-between gap-4 py-3 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{toggle.title}</p>
                  <p className="text-[11px] text-slate-400">{toggle.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean((settings as any)[toggle.key])}
                  onChange={(e) =>
                    setSettings({ ...settings, [toggle.key]: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#6538ED] focus:ring-[#6538ED]"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Regional Preferences */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 dark:border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Regional &amp; Format Preferences</h2>
            <p className="text-[11px] text-slate-400">Timezone and reporting display conventions</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Workspace Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
              <option value="UTC">UTC (+00:00)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Report Date Display Format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-[#6538ED] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="DD MMM YYYY">25 Nov 2026 (DD MMM YYYY)</option>
              <option value="DD/MM/YYYY">25/11/2026 (DD/MM/YYYY)</option>
              <option value="YYYY-MM-DD">2026-11-25 (ISO YYYY-MM-DD)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#6538ED]/25 transition disabled:opacity-50"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>{saving ? 'Applying Settings...' : 'Save & Apply Across Workspace'}</span>
        </button>
      </div>
    </form>
  );
}
