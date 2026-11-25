'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import SalmanLogo from '@/components/brand/SalmanLogo';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('A valid password reset token is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update password.');
      } else {
        setSuccessMsg(data.message || 'Password updated successfully.');
      }
    } catch {
      setError('Network error while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15172B] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#6538ED]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-[#8255FF]/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#252A54] bg-[#191D38] p-7 sm:p-9 shadow-2xl">
        <div className="mb-7 flex items-center justify-between">
          <SalmanLogo href="/" size="md" />
        </div>

        {successMsg ? (
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#12B886]/15 border border-[#12B886]/30 text-[#12B886]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-white">Password Updated</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{successMsg}</p>
            <Link
              href="/login"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3 text-xs font-bold text-white transition"
            >
              Sign In With New Password
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#111432] border border-[#252A54] text-[#8255FF] text-xs font-semibold mb-3">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Credential Reset</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                Choose a strong password of at least 8 characters to secure your account.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#EF476F]/30 bg-[#EF476F]/10 p-3.5 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 text-[#EF476F] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!initialToken && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Recovery Token
                  </label>
                  <input
                    type="text"
                    required
                    value={token}
                    disabled={loading}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your one-time recovery token"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] py-2.5 px-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#6538ED] focus:ring-2 focus:ring-[#6538ED]/25"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED] focus:ring-2 focus:ring-[#6538ED]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    disabled={loading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-[#2A2E5A] bg-[#0C0E22] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#6538ED] focus:ring-2 focus:ring-[#6538ED]/25"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#6538ED] hover:bg-[#562BD4] py-3 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Confirm Password Reset'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#252A54] flex items-center justify-between text-xs">
              <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
              <Link href="/forgot-password" className="font-semibold text-[#8255FF] hover:underline">
                Request new reset
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#15172B] flex items-center justify-center text-slate-300 text-sm">
          Loading recovery workspace...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
