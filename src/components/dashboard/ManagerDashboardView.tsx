"use client";

import React, { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Plane,
  Users,
  Percent,
  Sparkles,
  PhoneCall,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  Globe,
  Award,
  ChevronDown,
  ArrowRight,
  UserCheck,
  Lock,
  Unlock,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { Lead, User } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ManagerDashboardViewProps {
  leads: Lead[];
  currentUser: User;
  users: User[];
  onOpenPpcModal: () => void;
  onOpenQuickRemark: (lead: Lead) => void;
  onSelectLead: (lead: Lead, win?: string) => void;
  onRefresh?: () => Promise<void>;
  selectedAgentId: string;
  onSelectAgentId: (agentId: string) => void;
}

export function ManagerDashboardView({
  leads,
  currentUser,
  users,
  onOpenPpcModal,
  onOpenQuickRemark,
  onSelectLead,
  onRefresh,
  selectedAgentId,
  onSelectAgentId,
}: ManagerDashboardViewProps) {
  const [isDistributing, setIsDistributing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "ppc_analytics" | "pci_vault" | "remarks">("overview");

  // Active sales agents
  const salesAgents = useMemo(() => {
    return users.filter(
      (u) =>
        (u.role === "SALES_AGENT" || u.role.endsWith("_AGENT") || u.role.endsWith("_OPERATOR")) &&
        u.isActive
    );
  }, [users]);

  // Unassigned leads
  const unassignedLeads = useMemo(() => {
    return leads.filter((l) => !l.assignedToId || l.assignedToId === "UNASSIGNED");
  }, [leads]);

  // Filter leads based on selectedAgentId (if manager selects a specific agent)
  const displayLeads = useMemo(() => {
    if (selectedAgentId === "ALL") return leads;
    return leads.filter((l) => l.assignedToId === selectedAgentId);
  }, [leads, selectedAgentId]);

  // Team Consolidated Metrics
  const metrics = useMemo(() => {
    const totalBookings = displayLeads.length;
    const wonLeads = displayLeads.filter((l) =>
      ["SALE", "CHARGING", "SUCCESS"].includes(l.status)
    );
    const wonCount = wonLeads.length;
    const totalWonRevenue = wonLeads.reduce(
      (sum, l) => sum + (l.salePrice || l.dealValue || 0),
      0
    );
    const totalTeamMco = wonLeads.reduce((sum, l) => {
      const sp = l.salePrice ?? l.dealValue ?? 0;
      const tp = l.ticketPrice ?? 0;
      return sum + (l.mco !== undefined ? l.mco : Math.max(0, sp - tp));
    }, 0);
    const totalPipelineVolume = displayLeads.reduce(
      (sum, l) => sum + (l.salePrice || l.dealValue || 0),
      0
    );
    const overallWinRate =
      totalBookings > 0 ? ((wonCount / totalBookings) * 100).toFixed(1) : "0.0";

    // PPC specific stats
    const ppcLeads = displayLeads.filter(
      (l) => l.ppcSource || l.ppcChannel || l.footprint?.utmSource?.includes("ppc") || l.footprint?.utmMedium?.includes("cpc")
    );
    const ppcCount = ppcLeads.length;
    const ppcWon = ppcLeads.filter((l) => ["SALE", "CHARGING", "SUCCESS"].includes(l.status)).length;
    const ppcWonRevenue = ppcLeads
      .filter((l) => ["SALE", "CHARGING", "SUCCESS"].includes(l.status))
      .reduce((sum, l) => sum + (l.salePrice || l.dealValue || 0), 0);
    const ppcCallsCount = ppcLeads.filter(
      (l) => l.ppcChannel === "CALL_INBOUND" || l.footprint?.utmMedium?.includes("call")
    ).length;

    // Monthly Target (e.g. $180,000 for entire sales team)
    const monthlyTeamQuota = selectedAgentId === "ALL" ? 180000 : 60000;
    const quotaProgress = Math.min(100, (totalWonRevenue / monthlyTeamQuota) * 100);

    return {
      totalBookings,
      wonCount,
      totalWonRevenue,
      totalTeamMco,
      totalPipelineVolume,
      overallWinRate,
      ppcCount,
      ppcWon,
      ppcWonRevenue,
      ppcCallsCount,
      monthlyTeamQuota,
      quotaProgress,
    };
  }, [displayLeads, selectedAgentId]);

  // Agent Leaderboard computation
  const agentLeaderboard = useMemo(() => {
    return salesAgents.map((agent) => {
      const aLeads = leads.filter((l) => l.assignedToId === agent.id);
      const won = aLeads.filter((l) => ["SALE", "CHARGING", "SUCCESS"].includes(l.status));
      const wonRevenue = won.reduce((sum, l) => sum + (l.salePrice || l.dealValue || 0), 0);
      const wonMco = won.reduce((sum, l) => {
        const sp = l.salePrice ?? l.dealValue ?? 0;
        const tp = l.ticketPrice ?? 0;
        return sum + (l.mco !== undefined ? l.mco : Math.max(0, sp - tp));
      }, 0);
      const winRate = aLeads.length > 0 ? ((won.length / aLeads.length) * 100).toFixed(1) : "0.0";
      const pendingFollowups = aLeads.filter((l) =>
        ["NEW", "FOLLOW_UP", "AUTHENTICATION_SENT"].includes(l.status)
      ).length;

      return {
        agent,
        totalLeads: aLeads.length,
        wonCount: won.length,
        wonRevenue,
        wonMco,
        winRate,
        pendingFollowups,
      };
    }).sort((a, b) => b.wonRevenue - a.wonRevenue);
  }, [salesAgents, leads]);

  // PPC Campaign breakdown
  const ppcCampaignStats = useMemo(() => {
    const campaigns: Record<string, { count: number; won: number; revenue: number; source: string }> = {};

    for (const lead of leads) {
      const camp = lead.ppcCampaign || lead.footprint?.utmCampaign;
      const src = lead.ppcSource || lead.footprint?.utmSource || "Google Ads";
      if (camp) {
        if (!campaigns[camp]) {
          campaigns[camp] = { count: 0, won: 0, revenue: 0, source: src };
        }
        campaigns[camp].count++;
        if (["SALE", "CHARGING", "SUCCESS"].includes(lead.status)) {
          campaigns[camp].won++;
          campaigns[camp].revenue += lead.salePrice || lead.dealValue || 0;
        }
      }
    }

    return Object.entries(campaigns).map(([name, data]) => ({
      name,
      ...data,
      winRate: data.count > 0 ? ((data.won / data.count) * 100).toFixed(1) : "0.0",
    }));
  }, [leads]);

  // Active Temporary PCI Access Authorizations
  const activePciClearances = useMemo(() => {
    return leads.filter((l) => {
      const card = l.cardDetails;
      if (!card || !card.isAccessGrantedToAgent || !card.accessExpiresAt) return false;
      const remainingMs = new Date(card.accessExpiresAt).getTime() - Date.now();
      return remainingMs > 0;
    });
  }, [leads]);

  // Real-time Remarks Stream from across the team
  const teamRemarksStream = useMemo(() => {
    const stream: Array<{
      lead: Lead;
      remark: string;
      actorName: string;
      actorRole: string;
      timestamp: string;
    }> = [];

    for (const lead of leads) {
      if (lead.footprint?.clickstream) {
        for (const ev of lead.footprint.clickstream) {
          if (ev.remark && ev.remark.trim()) {
            stream.push({
              lead,
              remark: ev.remark,
              actorName: ev.actorName || "Team Member",
              actorRole: ev.actorRole || "SALES",
              timestamp: ev.timestamp,
            });
          }
        }
      }
    }

    return stream
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [leads]);

  // 1-Click Auto Round-Robin Handler
  const handleAutoRoundRobin = async () => {
    if (unassignedLeads.length === 0) return;
    setIsDistributing(true);
    try {
      const res = await fetch("/api/leads/round-robin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: currentUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✓ Auto Round-Robin Distributed: ${data.count} leads assigned evenly across ${salesAgents.length} active agents!`);
        if (onRefresh) await onRefresh();
      } else {
        alert("Round-robin distribution failed: " + data.error);
      }
    } catch (err) {
      console.error("Round robin failed:", err);
      alert("Error executing round-robin distribution.");
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="border-b border-slate-200 bg-white p-3 sm:p-4 space-y-3.5 shadow-2xs">
      {/* Top Header: Manager Title + Agent Selector + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-800 text-white shadow-md shadow-indigo-950/20 font-bold text-sm">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Sales Manager Command Center
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Team Oversight
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Consolidated Pipeline &bull; PPC Campaign ROI &bull; Agent Leaderboard &bull; PCI Vault Security
            </p>
          </div>
        </div>

        {/* Controls: Agent Filter & New PPC Lead Ingest Button */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Agent Filter Dropdown */}
          <div className="relative flex-1 sm:flex-none min-w-[170px]">
            <select
              value={selectedAgentId}
              onChange={(e) => onSelectAgentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 pr-8 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer hover:border-slate-400 transition"
            >
              <option value="ALL">👥 All Sales Agents (Consolidated)</option>
              {salesAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  👤 {agent.name} (@{agent.username || agent.name})
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* New PPC Ingestion Button */}
          <button
            type="button"
            onClick={onOpenPpcModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition active:scale-95 cursor-pointer shrink-0"
            title="Open PPC Inbound & Batch Lead Ingestion Center"
          >
            <Target className="h-3.5 w-3.5" />
            <span>+ Ingest PPC Lead</span>
          </button>
        </div>
      </div>

      {/* Urgent Unassigned PPC & Web Queue Banner (with 1-Click Auto Round-Robin!) */}
      {unassignedLeads.length > 0 && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-200/80 text-amber-900 shrink-0">
              <Zap className="h-5 w-5 text-amber-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-amber-950">
                  {unassignedLeads.length} Inbound Lead{unassignedLeads.length > 1 ? "s" : ""} Awaiting Agent Assignment
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-400 font-bold animate-pulse">
                  High Priority
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                New inquiries from <strong>travelocase.com</strong> and <strong>Google/Meta PPC ads</strong> arrive in the unassigned queue. Fast response increases conversion by 40%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isDistributing}
              onClick={handleAutoRoundRobin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition active:scale-95 cursor-pointer shrink-0"
              title="Automatically distribute all unassigned leads evenly among active sales agents"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{isDistributing ? "Distributing..." : "⚡ 1-Click Round-Robin Distribute"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Manager Metric Cards Grid (6-column) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {/* 1. Closed Sales Revenue */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-emerald-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>Closed Sales Volume</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900 font-mono">
              {formatCurrency(metrics.totalWonRevenue)}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              {metrics.wonCount} won flight(s)
            </div>
          </div>
        </div>

        {/* 2. Total Team MCO Profit */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-900 text-[11px] font-bold">
            <span>Team MCO Profit</span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-emerald-800 font-mono">
              +{formatCurrency(metrics.totalTeamMco)}
            </div>
            <div className="text-[10px] text-emerald-900 font-medium mt-0.5">
              Net Agency Commission
            </div>
          </div>
        </div>

        {/* 3. Total Handled Bookings */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-indigo-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>Total Bookings</span>
            <Plane className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-900 font-mono">
              {metrics.totalBookings} <span className="text-xs text-slate-500 font-normal">flights</span>
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              {formatCurrency(metrics.totalPipelineVolume)} gross
            </div>
          </div>
        </div>

        {/* 4. Win / Conversion Rate */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-cyan-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>Win Rate</span>
            <Percent className="h-3.5 w-3.5 text-cyan-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-cyan-700 font-mono">
              {metrics.overallWinRate}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {metrics.wonCount}/{metrics.totalBookings || 1} converted
            </div>
          </div>
        </div>

        {/* 5. PPC Ad Leads & Calls */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-purple-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>PPC Leads Ingested</span>
            <Target className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-purple-700 font-mono">
              {metrics.ppcCount} <span className="text-xs text-slate-500 font-normal">({metrics.ppcCallsCount} calls)</span>
            </div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">
              {formatCurrency(metrics.ppcWonRevenue)} won
            </div>
          </div>
        </div>

        {/* 6. Active Agents on Duty */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-500/50 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
            <span>Sales Force</span>
            <Users className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-blue-700 font-mono">
              {salesAgents.length} <span className="text-xs text-slate-500 font-normal">Active</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Ready for lead dispatch
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation for Manager Deep Dive Views */}
      <div className="flex items-center justify-between border-b border-slate-200 pt-1 text-xs font-semibold">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-scroll">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Executive Progress</span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "leaderboard"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Agent Leaderboard ({salesAgents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ppc_analytics")}
            className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "ppc_analytics"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>PPC Campaigns ({ppcCampaignStats.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pci_vault")}
            className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "pci_vault"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>PCI Vault Oversight ({activePciClearances.length} Active)</span>
          </button>

          <button
            onClick={() => setActiveTab("remarks")}
            className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "remarks"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Team Live Remarks Feed</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: EXECUTIVE PROGRESS & TARGETS                                   */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0 font-semibold text-slate-800">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Team Quota:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(metrics.totalWonRevenue)} / {formatCurrency(metrics.monthlyTeamQuota)}
              </span>
            </div>

            <div className="w-full sm:w-72 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${metrics.quotaProgress}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-slate-600 font-bold shrink-0">
                {metrics.quotaProgress.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg shrink-0">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>PCI-DSS Card Security Enforced &bull; Full PAN Masked for Sales Agents</span>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: AGENT LEADERBOARD / SCORECARD                                  */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "leaderboard" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Assigned Leads</th>
                <th className="py-2.5 px-3">Won Bookings</th>
                <th className="py-2.5 px-3">Revenue ($)</th>
                <th className="py-2.5 px-3">Agent MCO Profit ($)</th>
                <th className="py-2.5 px-3">Win Rate (%)</th>
                <th className="py-2.5 px-3">Pending Follow-ups</th>
                <th className="py-2.5 px-3 text-right">Filter Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {agentLeaderboard.map((item, idx) => (
                <tr key={item.agent.id} className="hover:bg-indigo-50/40 transition">
                  <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-slate-400 font-mono">
                      #{idx + 1}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                      {item.agent.name[0]}
                    </div>
                    <div>
                      <span className="font-semibold block">{item.agent.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">@{item.agent.username || item.agent.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium">{item.totalLeads}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{item.wonCount}</td>
                  <td className="py-2.5 px-3 font-mono font-bold">{formatCurrency(item.wonRevenue)}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">+{formatCurrency(item.wonMco)}</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-700 font-bold">{item.winRate}%</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700">{item.pendingFollowups}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectAgentId(item.agent.id)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 text-[11px] font-semibold transition"
                    >
                      Inspect Desk
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: PPC CAMPAIGN ROI ANALYTICS                                      */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "ppc_analytics" && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">PPC Campaign Name</th>
                  <th className="py-2.5 px-3">Network</th>
                  <th className="py-2.5 px-3">Leads Captured</th>
                  <th className="py-2.5 px-3">Converted (Won)</th>
                  <th className="py-2.5 px-3">Revenue ($)</th>
                  <th className="py-2.5 px-3">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ppcCampaignStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No PPC campaigns active yet. Click &ldquo;+ Ingest PPC Lead&rdquo; to add PPC search or call inquiries.
                    </td>
                  </tr>
                ) : (
                  ppcCampaignStats.map((camp) => (
                    <tr key={camp.name} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">{camp.name}</td>
                      <td className="py-2.5 px-3 text-indigo-600 uppercase font-mono font-bold text-[10px]">
                        {camp.source}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium">{camp.count}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{camp.won}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{formatCurrency(camp.revenue)}</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-700 font-bold">{camp.winRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 4: PCI VAULT SECURITY OVERSIGHT                                    */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "pci_vault" && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h4 className="text-sm font-bold">PCI-DSS Tokenized Vault Oversight</h4>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                All card numbers and CVVs are masked from sales agents by default. Temporary access expires automatically after 3 minutes.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              Active Grants: <strong>{activePciClearances.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leads
              .filter((l) => l.cardDetails)
              .slice(0, 6)
              .map((lead) => {
                const card = lead.cardDetails!;
                const isGranted = card.isAccessGrantedToAgent;
                return (
                  <div
                    key={lead.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          #{lead.bookingNumber} &bull; {lead.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                          {card.cardType}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-600 mt-1">
                        •••• •••• •••• {card.cardNumber.slice(-4)} &bull; Exp: {card.expiryMonth}/{card.expiryYear}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectLead(lead, "card_vault")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isGranted
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                      }`}
                    >
                      {isGranted ? <Unlock className="h-3.5 w-3.5 text-amber-700" /> : <Lock className="h-3.5 w-3.5 text-indigo-600" />}
                      <span>{isGranted ? "Clearance Active" : "Manage Vault"}</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 5: TEAM LIVE REMARKS STREAM                                        */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "remarks" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
              Live Stream of Agent Query Remarks:
            </span>
            <span className="text-slate-500 font-mono text-[11px]">{teamRemarksStream.length} Recorded Entries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {teamRemarksStream.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onSelectLead(item.lead, "overview")}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition cursor-pointer flex items-start justify-between gap-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-900">
                    <span className="text-indigo-600 font-mono">#{item.lead.bookingNumber}</span>
                    <span className="truncate">{item.lead.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      &bull; by <strong>{item.actorName}</strong> ({item.actorRole})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 italic mt-1">
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
