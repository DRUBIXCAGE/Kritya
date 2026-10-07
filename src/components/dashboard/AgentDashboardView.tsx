"use client";

import React, { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Plane,
  Percent,
  PhoneCall,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Target,
  Award,
  Zap,
} from "lucide-react";
import { Lead, User } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface AgentDashboardViewProps {
  leads: Lead[];
  currentUser: User;
  onOpenPpcModal?: () => void;
  onOpenQuickRemark: (lead: Lead) => void;
  onSelectLead: (lead: Lead, win?: string) => void;
  onFilterChange?: (status: string) => void;
  activeFilter?: string;
}

export function AgentDashboardView({
  leads,
  currentUser,
  onOpenPpcModal,
  onOpenQuickRemark,
  onSelectLead,
  onFilterChange,
  activeFilter = "ALL",
}: AgentDashboardViewProps) {
  // Only leads assigned to this agent
  const agentLeads = useMemo(() => {
    return leads.filter((l) => l.assignedToId === currentUser.id);
  }, [leads, currentUser.id]);

  // Compute metrics for the current agent
  const metrics = useMemo(() => {
    const totalAssigned = agentLeads.length;
    const wonLeads = agentLeads.filter((l) =>
      ["SALE", "CHARGING", "SUCCESS"].includes(l.status)
    );
    const wonCount = wonLeads.length;
    const wonRevenue = wonLeads.reduce(
      (sum, l) => sum + (l.salePrice || l.dealValue || 0),
      0
    );
    const wonMco = wonLeads.reduce((sum, l) => {
      const sp = l.salePrice ?? l.dealValue ?? 0;
      const tp = l.ticketPrice ?? 0;
      return sum + (l.mco !== undefined ? l.mco : Math.max(0, sp - tp));
    }, 0);
    const totalPipeline = agentLeads.reduce(
      (sum, l) => sum + (l.salePrice || l.dealValue || 0),
      0
    );
    const pendingFollowups = agentLeads.filter((l) =>
      ["NEW", "FOLLOW_UP", "AUTHENTICATION_SENT"].includes(l.status)
    ).length;
    const ppcLeadsCount = agentLeads.filter(
      (l) => l.ppcSource || l.ppcChannel || l.footprint?.utmSource?.includes("ppc")
    ).length;

    const conversionRate =
      totalAssigned > 0 ? ((wonCount / totalAssigned) * 100).toFixed(1) : "0.0";

    const monthlyQuota = 60000; // $60,000 personal monthly sales quota
    const quotaProgress = Math.min(100, (wonRevenue / monthlyQuota) * 100);

    return {
      totalAssigned,
      wonCount,
      wonRevenue,
      wonMco,
      totalPipeline,
      pendingFollowups,
      ppcLeadsCount,
      conversionRate,
      monthlyQuota,
      quotaProgress,
    };
  }, [agentLeads]);

  // Recent Remarks Feed for this agent
  const recentRemarks = useMemo(() => {
    const remarks: Array<{
      lead: Lead;
      remark: string;
      timestamp: string;
      actorName: string;
    }> = [];

    for (const lead of agentLeads) {
      if (lead.footprint?.clickstream) {
        for (const ev of lead.footprint.clickstream) {
          if (ev.remark && ev.actorId === currentUser.id) {
            remarks.push({
              lead,
              remark: ev.remark,
              timestamp: ev.timestamp,
              actorName: ev.actorName || currentUser.name,
            });
          }
        }
      }
    }

    // Sort newest first, top 4
    return remarks
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 4);
  }, [agentLeads, currentUser.id, currentUser.name]);

  return (
    <div className="border-b border-slate-200 bg-white p-3 sm:p-4 space-y-3.5 shadow-2xs">
      {/* Top Header Row: Agent Profile & Quick Action Desk */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 font-bold text-sm">
              {currentUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-400/20" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {currentUser.name}&rsquo;s Sales Desk
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Agent Cockpit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Role: <strong>{currentUser.role}</strong> &bull; {currentUser.email} &bull; Active Flight Pipeline
            </p>
          </div>
        </div>

        {/* Action Buttons for Agent */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenPpcModal && (
            <button
              type="button"
              onClick={onOpenPpcModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-bold shadow-sm shadow-amber-500/25 transition active:scale-95 cursor-pointer shrink-0"
              title="Log incoming telephone call from PPC Ad Campaign"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>+ Log Inbound PPC Call</span>
            </button>
          )}

          {agentLeads.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenQuickRemark(agentLeads[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
              <span>+ Quick Remark</span>
            </button>
          )}
        </div>
      </div>

      {/* Agent Sales Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {/* 1. Closed Sales Revenue */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-emerald-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>My Closed Sales</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900 font-mono">
              {formatCurrency(metrics.wonRevenue)}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              {metrics.wonCount} won flight(s)
            </div>
          </div>
        </div>

        {/* 2. Agent MCO Profit (Commission) */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-900 text-[11px] font-bold">
            <span>My MCO Profit</span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-emerald-800 font-mono">
              +{formatCurrency(metrics.wonMco)}
            </div>
            <div className="text-[10px] text-emerald-900 font-medium mt-0.5">
              Gross Sale &minus; Net Fare
            </div>
          </div>
        </div>

        {/* 3. My Total Assigned Bookings */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-indigo-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>My Active Leads</span>
            <Plane className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900 font-mono">
              {metrics.totalAssigned} <span className="text-xs text-slate-500 font-normal">leads</span>
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              {formatCurrency(metrics.totalPipeline)} volume
            </div>
          </div>
        </div>

        {/* 4. Conversion Rate */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-cyan-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>Win Rate</span>
            <Percent className="h-3.5 w-3.5 text-cyan-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-cyan-700 font-mono">
              {metrics.conversionRate}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {metrics.wonCount}/{metrics.totalAssigned || 1} converted
            </div>
          </div>
        </div>

        {/* 5. Pending Action & Follow-ups */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-amber-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>Pending Follow-ups</span>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-amber-700 font-mono">
              {metrics.pendingFollowups}
            </div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
              Requires contact
            </div>
          </div>
        </div>

        {/* 6. Inbound PPC Leads Handled */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-purple-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>PPC Leads Handled</span>
            <Target className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-purple-700 font-mono">
              {metrics.ppcLeadsCount}
            </div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">
              Google/Meta/Bing calls
            </div>
          </div>
        </div>
      </div>

      {/* Quota Progress & PCI Security Notice */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        {/* Monthly Target Bar */}
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-1.5 shrink-0 font-semibold text-slate-800">
            <Award className="h-4 w-4 text-amber-500" />
            <span>Monthly Target:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(metrics.wonRevenue)} / {formatCurrency(metrics.monthlyQuota)}
            </span>
          </div>

          <div className="w-full sm:w-64 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  metrics.quotaProgress >= 100
                    ? "bg-emerald-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${metrics.quotaProgress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-600 font-bold shrink-0">
              {metrics.quotaProgress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Strict PCI Vault Guarantee */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            PCI Security Vault: <strong>•••• •••• •••• 4242</strong> (Masked). Request Manager authorization for 3-minute clearance.
          </span>
        </div>
      </div>

      {/* Agent's Recent Remarks Stream Preview */}
      {recentRemarks.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase font-mono">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
              My Latest Query Remarks:
            </span>
            <span className="text-slate-500">Live Telemetry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {recentRemarks.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onSelectLead(item.lead, "overview")}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition cursor-pointer flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900">
                    <span className="text-indigo-600 font-mono">#{item.lead.bookingNumber}</span>
                    <span className="truncate">{item.lead.name}</span>
                    <span className="text-[10px] text-slate-600 font-normal">
                      ({item.lead.bookingDetails?.origin} &rarr; {item.lead.bookingDetails?.destination})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1 italic mt-0.5">
                    &ldquo;{item.remark}&rdquo;
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
