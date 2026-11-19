'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, MapPin } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <MapPin className="h-5 w-5" />
          </div>
          <span className="text-base font-bold text-slate-900 dark:text-white">SmartAttendance</span>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Check your email</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We have dispatched password reset instructions to <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reset password</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Enter your registered corporate email to receive a secure reset link.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email address
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700"
              >
                Send Reset Link
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
