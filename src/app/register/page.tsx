'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SalmanLogo from '@/components/brand/SalmanLogo';
import {
  Shield,
  Lock,
  Mail,
  User,
  Building2,
  Phone,
  MapPin,
  FileText,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    role: 'RETAILER',
    city: '',
    state: '',
    gstin: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed. Please verify your details.');
      }

      setSuccess('Registration successful! Redirecting to your workspace...');
      setTimeout(() => {
        router.push(data.redirectUrl || '/distribution');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#101225] text-slate-100 font-sans">
      {/* Left Sidebar Feature Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex w-5/12 flex-col justify-between bg-[#1B1D35] p-12 border-r border-[#252A54]">
        <div className="flex items-center justify-between">
          <SalmanLogo href="/" size="lg" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Public Website</span>
          </Link>
        </div>

        <div className="space-y-6 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#242850] px-3.5 py-1.5 text-xs font-bold text-purple-300 border border-[#353B75]">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span>Authorized B2B Channel Access</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Join the Salman Enterprises Distribution Network.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Gain direct access to Tier-1 smartphone supply, wholesale tier margins, live IMEI allocation, and dedicated regional warehouse logistics.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 rounded-xl bg-[#14162E] p-3.5 border border-[#252A54]">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Genuine Dual-IMEI Handsets</h4>
                <p className="text-[11px] text-slate-400">100% brand-authorized inventory with Rule 46 GST tax invoicing.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#14162E] p-3.5 border border-[#252A54]">
              <CheckCircle2 className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Automated Credit &amp; Quotations</h4>
                <p className="text-[11px] text-slate-400">Flexible 14-day trade credit lines for verified retail partners.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#14162E] p-3.5 border border-[#252A54]">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Express Regional Warehousing</h4>
                <p className="text-[11px] text-slate-400">Same-day dispatch from hubs in Bangalore, Mumbai, and Delhi.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 border-t border-[#252A54] pt-4 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Salman Enterprises Distribution Ltd.</span>
          <span className="text-emerald-400 font-semibold">PostgreSQL &bull; MongoDB Live</span>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:px-12 xl:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl">
          {/* Mobile Back & Brand */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
            <SalmanLogo href="/" size="sm" />
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#1B1D35] border border-[#252A54] text-purple-300 text-xs font-semibold mb-2">
              <Building2 className="h-3 w-3" />
              <span>Partner Onboarding Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create Your Account
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Register your retail business or distribution operations for instant platform access.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-[#1B1D35] p-6 sm:p-7 border border-[#252A54] shadow-xl">
            {/* Row 1: Full Name & Business Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Salman Khan"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Business / Shop Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Salman Mobile Hub"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corporate / Business Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="salman@example.com"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Role Selector & GSTIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Type / Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 px-3 text-xs font-medium text-white outline-none focus:border-[#7138F5]"
                >
                  <option value="RETAILER">Retail Partner (Shop Owner)</option>
                  <option value="DISTRIBUTOR">Sub-Distributor / Wholesaler</option>
                  <option value="SALES_EXECUTIVE">Field Sales Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  GSTIN (Optional)
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: City & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  City
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Bangalore"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Karnataka"
                  className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 px-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                />
              </div>
            </div>

            {/* Row 5: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-9 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#101225] py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-[#7138F5]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#7138F5] hover:bg-[#5E2DD4] py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-900/40 transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Creating Verified Account...</span>
                  </div>
                ) : (
                  <>
                    <span>Complete Partner Registration</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom Login Link */}
          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-purple-400 hover:text-purple-300 hover:underline">
              Sign In to Portal &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
