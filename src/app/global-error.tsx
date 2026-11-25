'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#15172B] text-white flex items-center justify-center px-4 py-12 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-[#252A54] bg-[#191D38] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EF476F]/15 text-[#EF476F]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Workspace Recovery Required</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300">
            The application encountered a critical rendering interruption.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Reload Workspace
          </button>
        </div>
      </body>
    </html>
  );
}
