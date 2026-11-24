'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  Calendar,
  CheckCircle2,
  DollarSign,
  Filter,
  Search,
  PlusCircle,
  FileText,
  Building,
  ArrowRight,
  TrendingUp,
  Receipt,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'runs' | 'payslips' | 'structures' | 'loans'>('runs');
  const [runs, setRuns] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // New Structure Modal Form
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [structureForm, setStructureForm] = useState({
    name: '',
    code: '',
    annualCtc: 600000,
    monthlyGross: 50000,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, payslipsRes, structuresRes, loansRes] = await Promise.all([
        fetch('/api/payroll/runs'),
        fetch(`/api/payroll/payslips?month=${selectedMonth}&year=${selectedYear}`),
        fetch('/api/payroll/salary-structures'),
        fetch('/api/payroll/loans'),
      ]);

      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(data.runs || []);
      }
      if (payslipsRes.ok) {
        const data = await payslipsRes.json();
        setPayslips(data.payslips || []);
      }
      if (structuresRes.ok) {
        const data = await structuresRes.json();
        setStructures(data.structures || []);
      }
      if (loansRes.ok) {
        const data = await loansRes.json();
        setLoans(data.loans || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run new payroll calculation
  const handleRunPayroll = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(`Payroll calculated for ${selectedMonth}/${selectedYear} (${data.payrollRun?.totalEmployees || 0} employees).`);
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Network error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize payroll
  const handleFinalize = async (runId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/payroll/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollRunId: runId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Payroll finalized! Generated ${data.result?.totalPayslipsGenerated || 0} payslips.`);
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Disburse payroll
  const handleDisburse = async (runId: string) => {
    const ref = prompt('Enter Bank Disbursement Reference / Batch ID (e.g. TXN-HDFC-99214):');
    if (!ref) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/payroll/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollRunId: runId, paymentReference: ref }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Disbursement recorded successfully. Status updated to PAID.`);
        fetchData();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Create salary structure
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payroll/salary-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...structureForm,
          components: [
            { name: 'Basic Salary', type: 'EARNING', monthlyAmount: structureForm.monthlyGross * 0.5 },
            { name: 'House Rent Allowance (HRA)', type: 'EARNING', monthlyAmount: structureForm.monthlyGross * 0.2 },
            { name: 'Special Allowance', type: 'EARNING', monthlyAmount: structureForm.monthlyGross * 0.3 },
            { name: 'Provident Fund (PF)', type: 'DEDUCTION', monthlyAmount: structureForm.monthlyGross * 0.5 * 0.12 },
            { name: 'Professional Tax (PT)', type: 'DEDUCTION', monthlyAmount: 200 },
          ],
        }),
      });

      if (res.ok) {
        setIsStructureModalOpen(false);
        setStructureForm({ name: '', code: '', annualCtc: 600000, monthlyGross: 50000 });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Enterprise Payroll & Compensation
            </h1>
            <span className="rounded-full bg-[#5428E8]/10 px-2.5 py-0.5 text-xs font-bold text-[#5428E8]">
              Automated Statutory Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time biometric attendance sync, statutory deductions (PF, ESI, PT, TDS), and official PDF payslips
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunPayroll}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-2xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#5428E8]/25 hover:bg-[#431fbd] transition disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{actionLoading ? 'Calculating...' : 'Run Monthly Payroll'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-100 bg-[#F6F5FF] p-4 text-xs font-medium text-[#5428E8] shadow-xs">
          {feedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { key: 'runs', label: 'Monthly Payroll Runs', icon: CreditCard, count: runs.length },
          { key: 'payslips', label: 'Official Payslips & PDF', icon: FileText, count: payslips.length },
          { key: 'structures', label: 'Salary Structures', icon: Layers, count: structures.length },
          { key: 'loans', label: 'Loans & Advances', icon: Receipt, count: loans.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                isActive
                  ? 'bg-[#5428E8] text-white shadow-md shadow-[#5428E8]/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MONTHLY RUNS */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          {runs.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-700">No Payroll Runs Executed</h3>
              <p className="mt-1 text-xs text-slate-400">
                Click &quot;Run Monthly Payroll&quot; to calculate salary and deductions for {selectedMonth}/{selectedYear}.
              </p>
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Payroll Cycle: {new Date(run.payrollPeriod.year, run.payrollPeriod.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          run.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : run.status === 'FINALIZED'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Batch #{run.runNumber} • Headcount: {run.totalEmployees} Employees
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {run.status === 'DRAFT' && (
                      <button
                        onClick={() => handleFinalize(run.id)}
                        disabled={actionLoading}
                        className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
                      >
                        Finalize & Generate Payslips
                      </button>
                    )}
                    {run.status === 'FINALIZED' && (
                      <button
                        onClick={() => handleDisburse(run.id)}
                        disabled={actionLoading}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                      >
                        Mark as Disbursed / Paid
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl bg-[#F6F5FF] p-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Gross Payable</span>
                    <p className="mt-1 text-lg font-black text-slate-900">₹{run.totalGrossPayable.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50/60 p-4">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Total Deductions</span>
                    <p className="mt-1 text-lg font-black text-amber-900">₹{run.totalDeductions.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/60 p-4">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Net Disbursable</span>
                    <p className="mt-1 text-lg font-black text-emerald-900">₹{run.totalNetPayable.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-purple-50/60 p-4">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Overtime Component</span>
                    <p className="mt-1 text-lg font-black text-purple-900">₹{run.totalOvertimeAmount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Employee Records Preview */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Payable Days</th>
                        <th className="py-2.5 px-3">Basic</th>
                        <th className="py-2.5 px-3">Gross</th>
                        <th className="py-2.5 px-3">PF/ESI/PT</th>
                        <th className="py-2.5 px-3">LWP / Deduction</th>
                        <th className="py-2.5 px-3">Net Salary</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {run.employeeRecords?.slice(0, 10).map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">
                              {rec.employee.firstName} {rec.employee.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400">{rec.employee.employeeCode}</p>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {rec.payableDays} / {rec.totalWorkingDays}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">₹{rec.basicSalary.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">₹{rec.grossSalary.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-mono text-amber-700">
                            ₹{(rec.pfDeduction + rec.esiDeduction + rec.professionalTax).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-red-600">
                            ₹{(rec.lwpDeduction + rec.loanRecovery).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-600">
                            ₹{rec.netSalary.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-700">
                              {rec.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: OFFICIAL PAYSLIPS & PDF DOWNLOAD */}
      {activeTab === 'payslips' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Generated Official Payslips</h3>
              <p className="text-xs text-slate-400">
                Print or download system-certified PDF payslips compliant with statutory audits
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-3">Payslip Number</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Gross Salary</th>
                  <th className="py-3 px-3">Deductions</th>
                  <th className="py-3 px-3">Net Pay</th>
                  <th className="py-3 px-3 text-right">PDF Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-[#5428E8]">{ps.payslipNumber}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {ps.employee.firstName} {ps.employee.lastName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{ps.employee.department?.name || 'General'}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Date(ps.year, ps.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium">₹{ps.grossSalary.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-amber-700">₹{ps.totalDeductions.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono font-black text-emerald-600">₹{ps.netSalary.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={`/api/payroll/payslips/${ps.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#5428E8]/10 px-3 py-1.5 text-xs font-bold text-[#5428E8] hover:bg-[#5428E8] hover:text-white transition"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALARY STRUCTURES */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">Grade & Salary Structure Templates</h3>
            <button
              onClick={() => setIsStructureModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-[#5428E8] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#431fbd] transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>New Structure</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {structures.map((s) => (
              <div key={s.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900">{s.name}</h4>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                    {s.code}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>
                    Monthly Gross: <span className="font-bold text-slate-900">₹{s.monthlyGross.toLocaleString()}</span>
                  </p>
                  <p>
                    Annual CTC: <span className="font-bold text-slate-900">₹{s.annualCtc.toLocaleString()}</span>
                  </p>
                  <p>
                    Assigned Employees: <span className="font-bold text-[#5428E8]">{s._count?.assignments || 0}</span>
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                  {s.components?.length || 0} Salary Components Configured
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LOANS & ADVANCES */}
      {activeTab === 'loans' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Employee Loans & Advance EMI Recovery</h3>
              <p className="text-xs text-slate-400">
                Monthly EMI installments are automatically deducted from the monthly payroll runner
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Principal Loan</th>
                  <th className="py-3 px-3">Tenure</th>
                  <th className="py-3 px-3">Monthly EMI</th>
                  <th className="py-3 px-3">Repaid</th>
                  <th className="py-3 px-3">Outstanding</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">
                        {loan.employee.firstName} {loan.employee.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400">{loan.employee.employeeCode}</p>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">₹{loan.principalAmount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-600">{loan.tenureMonths} Months</td>
                    <td className="py-3 px-3 font-mono font-semibold text-amber-700">₹{loan.monthlyInstallment.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-emerald-600">₹{loan.totalRepaid.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono font-black text-red-600">₹{loan.outstandingBalance.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
                          loan.status === 'ACTIVE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Salary Structure */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60  p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Add Salary Structure</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Defines grade-level earnings and statutory deduction rules
            </p>

            <form onSubmit={handleCreateStructure} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Structure Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer Grade 1"
                  value={structureForm.name}
                  onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Grade / Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ENG-L3"
                  value={structureForm.code}
                  onChange={(e) => setStructureForm({ ...structureForm, code: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Monthly Gross (₹)</label>
                  <input
                    type="number"
                    required
                    value={structureForm.monthlyGross}
                    onChange={(e) => {
                      const m = parseFloat(e.target.value) || 0;
                      setStructureForm({ ...structureForm, monthlyGross: m, annualCtc: m * 12 });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Annual CTC (₹)</label>
                  <input
                    type="number"
                    required
                    value={structureForm.annualCtc}
                    onChange={(e) => setStructureForm({ ...structureForm, annualCtc: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5428E8] px-4 py-2 text-xs font-bold text-white hover:bg-[#431fbd]"
                >
                  Create Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
