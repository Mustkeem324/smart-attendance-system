'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader, EmptyState, SkeletonCards } from '@/components/ui/EnterpriseUI';
import { Users, Mail, Building2, MapPin, ShieldCheck } from 'lucide-react';

function MemberCard({ member, badge }: { member: any; badge?: string }) {
  return (
    <div className="enterprise-card p-4 flex items-center gap-3.5">
      <div className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden border border-[#6538ED]/25 bg-[#F6F5FF] flex items-center justify-center font-bold text-xs text-[#6538ED]">
        {member.profilePhoto ? (
          <img src={member.profilePhoto} alt={member.firstName} className="h-full w-full object-cover" />
        ) : (
          <span>
            {member.firstName?.[0]}
            {member.lastName?.[0]}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {member.firstName} {member.lastName}
          </h4>
          {badge && (
            <span className="rounded-md bg-[#6538ED]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#6538ED]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 truncate">{member.designation}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1 truncate">
            <Mail className="h-3 w-3" /> {member.email}
          </span>
          {member.branch?.name && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {member.branch.name}
            </span>
          )}
          {member.department?.name && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {member.department.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeTeamPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employee/team')
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCards count={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team & Directory"
        subtitle="View your reporting structure, department teammates, and branch colleagues."
        eyebrow="My Information"
      />

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#6538ED]" />
          <span>Reporting Manager</span>
        </h3>
        {data?.manager ? (
          <div className="max-w-lg">
            <MemberCard member={data.manager} badge="Reporting Manager" />
          </div>
        ) : (
          <EmptyState
            title="Reports directly to Executive Administration"
            description="No intermediate reporting manager is assigned on your employee profile."
          />
        )}
      </div>

      {Array.isArray(data?.directReports) && data.directReports.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#12B886]" />
            <span>Direct Reports ({data.directReports.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.directReports.map((m: any) => (
              <MemberCard key={m.id} member={m} badge={m.employeeCode} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Department &amp; Branch Teammates ({(data?.departmentPeers?.length || 0) + (data?.branchColleagues?.length || 0)})
        </h3>
        {(data?.departmentPeers?.length || 0) === 0 && (data?.branchColleagues?.length || 0) === 0 ? (
          <EmptyState
            title="No teammates found in directory"
            description="Other active colleagues assigned to your department or branch will display here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.departmentPeers || []).map((m: any) => (
              <MemberCard key={m.id} member={m} badge="Same Dept" />
            ))}
            {(data?.branchColleagues || []).map((m: any) => (
              <MemberCard key={m.id} member={m} badge={m.employeeCode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
