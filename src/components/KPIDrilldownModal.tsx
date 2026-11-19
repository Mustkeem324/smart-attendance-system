'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink } from 'lucide-react';
import { EmployeeDailyStatus } from '@/lib/analytics';
import Modal from './Modal';

interface KPIDrilldownModalProps {
  isOpen: boolean;
  title: string;
  category: string;
  employees: EmployeeDailyStatus[];
  onClose: () => void;
}

export default function KPIDrilldownModal({
  isOpen,
  title,
  category,
  employees,
  onClose,
}: KPIDrilldownModalProps) {
  const [search, setSearch] = useState('');

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      e.departmentName.toLowerCase().includes(search.toLowerCase()) ||
      e.designation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`${employees.length} employee${employees.length === 1 ? '' : 's'} matching: ${category}`}
      maxWidthClass="max-w-4xl"
      panelClassName="max-h-[85vh]"
      footer={
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {filtered.length} of {employees.length} records
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-master-indigo dark:bg-slate-800 dark:text-slate-300"
          >
            Close
          </button>
        </div>
      }
    >
      {/* Search Filter */}
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search filtered employees by name, ID or department"
            placeholder="Search filtered employees by name, ID, department..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
          />
        </div>
      </div>

      {/* Employees Table List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No employees match this filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase dark:border-slate-800">
                <tr>
                  <th scope="col" className="py-3 px-3">Employee</th>
                  <th scope="col" className="py-3 px-3">Department &amp; Branch</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-3">Punch In / Out</th>
                  <th scope="col" className="py-3 px-3">Hours</th>
                  <th scope="col" className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((emp) => {
                  const checkInTime = emp.checkInTime
                    ? new Date(emp.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--';
                  const checkOutTime = emp.checkOutTime
                    ? new Date(emp.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--';

                  return (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {emp.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {emp.employeeCode} • {emp.designation}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{emp.departmentName}</p>
                        <p className="text-[11px] text-slate-400">{emp.branchName}</p>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            emp.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : emp.status === 'LATE'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                              : emp.status === 'ABSENT'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                              : emp.status === 'ON_LEAVE'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                              : emp.status === 'WORK_FROM_HOME'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {emp.status}
                        </span>
                        {emp.reason && (
                          <p className="mt-0.5 max-w-[140px] truncate text-[10px] italic text-slate-400">
                            {emp.reason}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {checkInTime} - {checkOutTime}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {emp.totalHours > 0 ? `${emp.totalHours}h` : '--'}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/employees/${emp.employeeId}`}
                          onClick={onClose}
                          aria-label={`Open profile for ${emp.name}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
