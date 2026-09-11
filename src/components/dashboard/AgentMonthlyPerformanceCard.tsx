"use client";

import React, { useState, useMemo } from "react";
import { Lead, User } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Users,
  Plane,
  Mail,
  CheckCircle2,
  Calendar,
  Award,
  Target,
  Percent,
  PhoneCall,
  UserCheck,
  ChevronDown,
  Sparkles,
  Zap,
} from "lucide-react";

interface AgentMonthlyPerformanceCardProps {
  leads: Lead[];
  currentUser: User;
  users?: User[];
}

export function AgentMonthlyPerformanceCard({
  leads,
  currentUser,
  users = [],
}: AgentMonthlyPerformanceCardProps) {
  const isSalesAgent = currentUser.role === "SALES_AGENT";
  const isManagerOrAdmin = !isSalesAgent;

  // Selected Agent (for managers/admins to inspect individual agents)
  const salesAgents = useMemo(() => {
    return users.filter((u) => u.role === "SALES_AGENT");
  }, [users]);

  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    isSalesAgent ? currentUser.id : "ALL"
  );

  // Selected Month (Format: "2026-09", "2026-08", "2026-07", or "ALL")
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-09");

  // Available Month Presets
  const MONTH_OPTIONS = [
    { label: "September 2026 (Current)", value: "2026-09" },
    { label: "August 2026", value: "2026-08" },
    { label: "July 2026", value: "2026-07" },
    { label: "June 2026", value: "2026-06" },
    { label: "All Months (YTD 2026)", value: "ALL" },
  ];

  // Active target agent object
  const activeAgent = useMemo(() => {
    if (isSalesAgent) return currentUser;
    if (selectedAgentId === "ALL") return null;
    return salesAgents.find((u) => u.id === selectedAgentId) || null;
  }, [isSalesAgent, currentUser, selectedAgentId, salesAgents]);

  // Compute metrics for selected agent & month
  const metrics = useMemo(() => {
    // 1. Filter by Agent
    let agentLeads = leads;
    if (isSalesAgent) {
      agentLeads = leads.filter((l) => l.assignedToId === currentUser.id);
    } else if (selectedAgentId !== "ALL") {
      agentLeads = leads.filter((l) => l.assignedToId === selectedAgentId);
    }

    // 2. Filter by Month
    if (selectedMonth !== "ALL") {
      agentLeads = agentLeads.filter((l) => {
        const leadMonth = l.createdAt ? l.createdAt.slice(0, 7) : "";
        return leadMonth === selectedMonth;
      });
    }

    // 3. Calculate Stats
    const totalInquiries = agentLeads.length;
    const wonLeads = agentLeads.filter((l) =>
      ["SALE", "CHARGING", "SUCCESS"].includes(l.status)
    );
    const wonCount = wonLeads.length;
    const wonRevenue = wonLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
    const totalPipelineValue = agentLeads.reduce(
      (acc, l) => acc + (l.dealValue || 0),
      0
    );

    const authEmailsSent = agentLeads.filter((l) => l.authEmailSent).length;
    const callConfirmed = agentLeads.filter((l) => l.authCallConfirmed).length;
    const pendingFollowups = agentLeads.filter((l) =>
      ["NEW", "FOLLOW_UP", "AUTHENTICATION_SENT"].includes(l.status)
    ).length;

    const conversionRate =
      totalInquiries > 0 ? ((wonCount / totalInquiries) * 100).toFixed(1) : "0.0";
    const avgTicketSize =
      wonCount > 0 ? Math.round(wonRevenue / wonCount) : totalInquiries > 0 ? Math.round(totalPipelineValue / totalInquiries) : 0;

    // Monthly Target (e.g. $60,000 per individual agent, $150,000 for team)
    const monthlyQuota = selectedAgentId === "ALL" ? 150000 : 60000;
    const quotaProgress = Math.min(100, (wonRevenue / monthlyQuota) * 100);

    return {
      totalInquiries,
      wonCount,
      wonRevenue,
      totalPipelineValue,
      authEmailsSent,
      callConfirmed,
      pendingFollowups,
      conversionRate,
      avgTicketSize,
      monthlyQuota,
      quotaProgress,
    };
  }, [leads, isSalesAgent, currentUser, selectedAgentId, selectedMonth]);

  return (
    <div className="border-b border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-3 sm:p-4 space-y-3">
      {/* Top Header Row: Agent Profile / Switcher + Month Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: Agent Identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20 font-bold text-sm">
              {activeAgent
                ? activeAgent.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "ALL"}
            </div>
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {activeAgent
                  ? `${activeAgent.name}'s Monthly Sales Desk`
                  : "All Sales Agents Monthly Overview"}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                {isSalesAgent ? "My Performance" : "Agent Scorecard"}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeAgent
                ? `${activeAgent.role} • ${activeAgent.email}`
                : "Consolidated Flight Sales & Commission Revenue"}
            </p>
          </div>
        </div>

        {/* Right: Controls (Agent Selector for Managers + Month Selector) */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Agent Dropdown for Managers/Admins */}
          {isManagerOrAdmin && salesAgents.length > 0 && (
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full sm:w-auto bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 pr-7 text-xs text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="ALL">👥 All Sales Agents (Team)</option>
                {salesAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    👤 {agent.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Month Selector Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto bg-slate-900 border border-indigo-500/50 rounded-lg px-2.5 py-1.5 pr-7 text-xs text-indigo-200 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer shadow-sm"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value} className="bg-slate-950 text-slate-200">
                  📅 {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-indigo-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Monthly Sales Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. Monthly Closed Sales Revenue */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/50 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Closed Sales</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
              {formatCurrency(metrics.wonRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>{metrics.wonCount} deals won</span>
            </div>
          </div>
        </div>

        {/* 2. Monthly Bookings Handled */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/50 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Total Bookings</span>
            <Plane className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-bold text-white font-mono">
              {metrics.totalInquiries} <span className="text-xs text-slate-400 font-normal">Flights</span>
            </div>
            <div className="text-[10px] text-indigo-300 mt-0.5">
              {formatCurrency(metrics.totalPipelineValue)} volume
            </div>
          </div>
        </div>

        {/* 3. Conversion / Win Rate */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/50 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Conversion Rate</span>
            <Percent className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-bold text-cyan-300 font-mono">
              {metrics.conversionRate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.wonCount}/{metrics.totalInquiries || 1} converted
            </div>
          </div>
        </div>

        {/* 4. Travel Auth Emails Sent */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-purple-500/50 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Auth Emails</span>
            <Mail className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-bold text-purple-300 font-mono">
              {metrics.authEmailsSent}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              from ticketing@travelocase.com
            </div>
          </div>
        </div>

        {/* 5. Pending Verbal / Auth Follow-ups */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/50 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Pending Follow-ups</span>
            <PhoneCall className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-bold text-amber-300 font-mono">
              {metrics.pendingFollowups}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.callConfirmed} calls confirmed
            </div>
          </div>
        </div>

        {/* 6. Average Deal Ticket Size */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/50 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Avg Ticket Size</span>
            <Target className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-bold text-blue-300 font-mono">
              {formatCurrency(metrics.avgTicketSize)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              per closed passenger
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Quota & Target Progress Bar */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 shrink-0">
          <Award className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-slate-200">
            Monthly Quota Target ({formatCurrency(metrics.monthlyQuota)}):
          </span>
          <span className="font-mono font-bold text-emerald-400">
            {formatCurrency(metrics.wonRevenue)} achieved ({metrics.quotaProgress.toFixed(1)}%)
          </span>
        </div>

        <div className="w-full sm:w-72 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.quotaProgress >= 100
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                  : metrics.quotaProgress >= 70
                  ? "bg-gradient-to-r from-indigo-500 to-emerald-400"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${metrics.quotaProgress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0 font-bold">
            {metrics.quotaProgress >= 100 ? "🎉 Quota Exceeded" : `${(100 - metrics.quotaProgress).toFixed(0)}% to target`}
          </span>
        </div>
      </div>
    </div>
  );
}
