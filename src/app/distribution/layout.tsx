'use client';

import React, { useState } from 'react';
import { DistributionSidebar } from '@/components/distribution/DistributionSidebar';
import { DistributionHeader } from '@/components/distribution/DistributionHeader';
import { CommandPalette } from '@/components/distribution/CommandPalette';

export default function DistributionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080A1B] text-[#F8F9FF] font-sans antialiased flex flex-col lg:flex-row">
      {/* 23-Module Enterprise Sidebar */}
      <DistributionSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DistributionHeader
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Global Cmd+K Search Palette */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
