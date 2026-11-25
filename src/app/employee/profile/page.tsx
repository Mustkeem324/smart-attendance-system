'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import { PageHeader, StatusBadge, SkeletonCards } from '@/components/ui/EnterpriseUI';
import EmployeePhotoUploadModal, { saveOwnProfilePhoto } from '@/components/employees/EmployeePhotoUploadModal';
import {
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Building2,
  Clock,
  Briefcase,
  Save,
  ShieldCheck,
} from 'lucide-react';

export default function EmployeeProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useUi();

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '', emergencyContact: '' });

  const loadProfile = useCallback(async () => {
    if (!user?.employee?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/employees/${user.employee.id}`);
      const data = await res.json();
      if (res.ok && data.employee) {
        setEmployee(data.employee);
        setForm({
          phone: data.employee.phone || '',
          address: data.employee.address || '',
          emergencyContact: data.employee.emergencyContact || '',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.employee?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not update profile details');
        return;
      }
      setEmployee(data.employee);
      toast.success('Your contact details have been updated.');
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonCards count={3} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your professional headshot, contact information, and view verified HR records."
        eyebrow="My Information"
      />

      {!employee ? (
        <div className="enterprise-card p-6 text-xs text-slate-500">
          Your account does not have an individual employee HR profile attached ({user?.email}).
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Identity & Photo Card */}
          <div className="lg:col-span-4 enterprise-card p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="h-28 w-28 rounded-3xl overflow-hidden border-2 border-[#6538ED] shadow-md bg-[#F6F5FF] flex items-center justify-center">
                {employee.profilePhoto || user?.profilePhoto ? (
                  <img
                    src={employee.profilePhoto || user?.profilePhoto || ''}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-[#6538ED]">
                    {employee.firstName[0]}
                    {employee.lastName[0]}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                aria-label="Update your profile photo"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#6538ED] text-white shadow-lg hover:bg-[#562BD4]"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-xs text-slate-500">{employee.designation}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="font-mono text-xs font-bold text-[#6538ED] bg-[#F6F5FF] px-2.5 py-0.5 rounded-lg">
                  {employee.employeeCode}
                </span>
                <StatusBadge status={employee.employmentStatus} />
              </div>
            </div>

            <div className="w-full rounded-2xl border border-[#6538ED]/25 bg-[#F6F5FF] p-3 text-left text-[11px] dark:bg-[#191C3A]">
              <p className="font-bold text-[#15172B] dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#6538ED]" />
                <span>Professional Photo Reminder</span>
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Please upload a clear, front-facing business portrait. Stored securely inside folder{' '}
                <code className="font-mono text-[#6538ED]">uploads/profiles/{employee.id}/</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="enterprise-btn-primary w-full text-xs inline-flex items-center justify-center gap-1.5"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{employee.profilePhoto ? 'Update My Photo' : 'Add Own Photo'}</span>
            </button>
          </div>

          {/* Details & Contact Form */}
          <div className="lg:col-span-8 space-y-6">
            <div className="enterprise-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4 text-[#6538ED]" />
                <span>Employment Assignment</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Official Email</p>
                    <p className="font-semibold text-slate-800 dark:text-white">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Department</p>
                    <p className="font-semibold text-slate-800 dark:text-white">{employee.department?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Assigned Branch</p>
                    <p className="font-semibold text-slate-800 dark:text-white">{employee.branch?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Shift &amp; Weekly Off</p>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {employee.shift?.name} ({employee.shift?.startTime}–{employee.shift?.endTime}) • {employee.weeklyOff}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[11px] text-slate-400">Reporting Manager</p>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {employee.manager
                        ? `${employee.manager.firstName} ${employee.manager.lastName}`
                        : 'Executive Administration'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveContact} className="enterprise-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#6538ED]" />
                <span>Personal Contact &amp; Emergency Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    placeholder="Name & phone number"
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    className="enterprise-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="enterprise-input"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Contact Information'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {employee && (
        <EmployeePhotoUploadModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          isSelfService
          targetEmployeeId={employee.id}
          targetUserId={user?.id}
          currentPhoto={employee.profilePhoto || user?.profilePhoto || null}
          employeeName={`${employee.firstName} ${employee.lastName}`}
          onSave={async (url) => {
            const data = await saveOwnProfilePhoto(url);
            await refreshUser();
            await loadProfile();
            toast.success(
              url ? `Professional photo saved in folder ${data.folder || employee.id}.` : 'Profile photo removed.'
            );
          }}
        />
      )}
    </div>
  );
}
