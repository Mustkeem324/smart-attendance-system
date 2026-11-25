'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import {
  Users,
  Search,
  PlusCircle,
  Filter,
  Download,
  Building2,
  MapPin,
  Clock,
  ArrowUpRight,
  X,
  CheckCircle2,
  Camera,
  Upload,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import EmployeePhotoUploadModal, { CORPORATE_PORTRAITS } from '@/components/employees/EmployeePhotoUploadModal';

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Photo Update Modal State
  const [photoModalEmployee, setPhotoModalEmployee] = useState<any | null>(null);

  // New Employee Form State
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    departmentId: '',
    branchId: '',
    shiftId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'FULL_TIME',
    weeklyOff: 'SUNDAY',
    baseSalary: 70000,
    role: 'EMPLOYEE',
    profilePhoto: '',
  });

  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (deptFilter) params.append('departmentId', deptFilter);
      if (branchFilter) params.append('branchId', branchFilter);
      if (statusFilter) params.append('status', statusFilter);

      const [empRes, deptRes, branchRes, shiftRes] = await Promise.all([
        fetch(`/api/employees?${params.toString()}`),
        fetch('/api/departments'),
        fetch('/api/branches'),
        fetch('/api/shifts'),
      ]);

      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const branchData = await branchRes.json();
      const shiftData = await shiftRes.json();

      setEmployees(empData.employees || []);
      setDepartments(deptData.departments || []);
      setBranches(branchData.branches || []);
      setShifts(shiftData.shifts || []);

      if (deptData.departments?.[0]) {
        setFormData((prev) =>
          prev.departmentId
            ? prev
            : {
                ...prev,
                departmentId: deptData.departments[0].id,
                branchId: branchData.branches?.[0]?.id || '',
                shiftId: shiftData.shifts?.[0]?.id || '',
              }
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, branchFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(`Employee ${data.employee.firstName} ${data.employee.lastName} registered!`);
        toast.success(`Employee ${data.employee.firstName} ${data.employee.lastName} registered.`);
        setIsAddModalOpen(false);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to create employee');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Employees & Workforce Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage organization employees, designations, branches, and shifts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/reports/excel-import"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <span>Import Excel</span>
          </Link>
          {isElevated && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-600 dark:border-slate-800 dark:bg-slate-800"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Directory Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Designation</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Branch</th>
                <th className="px-5 py-3.5">Shift</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No employees found matching criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {emp.employeeCode}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setPhotoModalEmployee(emp)}
                          className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-slate-200 bg-brand-50 shadow-sm transition hover:scale-105 hover:ring-2 hover:ring-brand-500/50 dark:border-slate-700 dark:bg-brand-950/60"
                          title="Click to change or view corporate photo"
                        >
                          {emp.profilePhoto ? (
                            <img
                              src={emp.profilePhoto}
                              alt={`${emp.firstName} ${emp.lastName}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                              {emp.firstName[0]}
                              {emp.lastName[0]}
                            </span>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="h-4 w-4 text-white drop-shadow" />
                          </div>
                        </button>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {emp.firstName} {emp.lastName}
                            </span>
                            {emp.profilePhoto && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" title="Corporate Portrait Active" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {emp.designation}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {emp.department?.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {emp.branch?.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {emp.shift?.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhotoModalEmployee(emp)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Change employee portrait"
                        >
                          <Camera className="h-3 w-3 text-brand-600" />
                          <span className="hidden sm:inline">Photo</span>
                        </button>
                        <Link
                          href={`/employees/${emp.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <span>View</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 ">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Register New Employee
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              {/* Employee Photo Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Profile Photograph
                </label>
                <p className="text-[11px] text-[#6538ED] dark:text-purple-300 font-medium mb-2.5">
                  Please upload a clear, professional headshot photo (front-facing, good lighting, plain background). Saved automatically under the employee&apos;s ID folder.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-brand-500 shadow bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                    {formData.profilePhoto ? (
                      <img
                        src={formData.profilePhoto}
                        alt="Employee portrait preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-300">
                        {formData.firstName?.[0] || 'E'}{formData.lastName?.[0] || 'M'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Upload className="h-3.5 w-3.5 text-brand-600" />
                        <span>Upload Photo File</span>
                      </button>
                      <input
                        ref={addFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append('file', file);
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: fd });
                            const data = await res.json();
                            if (res.ok && data.url) {
                              setFormData((prev) => ({ ...prev, profilePhoto: data.url }));
                            } else {
                              toast.error(data.error || 'Failed to upload photo');
                            }
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                      />
                      {formData.profilePhoto && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, profilePhoto: '' }))}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Clear Photo
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Or choose from executive portraits:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {CORPORATE_PORTRAITS.slice(0, 7).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, profilePhoto: p.url }))}
                            className={`relative h-9 w-9 shrink-0 rounded-lg overflow-hidden border transition-all ${
                              formData.profilePhoto === p.url
                                ? 'border-brand-600 ring-2 ring-brand-500/50 scale-105'
                                : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                            }`}
                            title={p.name}
                          >
                            <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-010"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Branch *
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Shift *
                  </label>
                  <select
                    value={formData.shiftId}
                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-700"
                >
                  Create Employee & Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Upload Modal for existing employee */}
      {photoModalEmployee && (
        <EmployeePhotoUploadModal
          isOpen={Boolean(photoModalEmployee)}
          onClose={() => setPhotoModalEmployee(null)}
          targetEmployeeId={photoModalEmployee.id}
          currentPhoto={photoModalEmployee.profilePhoto}
          employeeName={`${photoModalEmployee.firstName} ${photoModalEmployee.lastName}`}
          onSave={async (photoUrl) => {
            const res = await fetch(`/api/employees/${photoModalEmployee.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profilePhoto: photoUrl }),
            });
            const data = await res.json();
            if (res.ok) {
              setFeedback(`Profile photo updated for ${photoModalEmployee.firstName} ${photoModalEmployee.lastName}!`);
              toast.success('Employee profile photo updated.');
              fetchData();
            } else {
              toast.error(data.error || 'Failed to update photo');
            }
          }}
        />
      )}
    </div>
  );
}
