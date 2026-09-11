"use client";

import React, { useState, useMemo } from "react";
import { Lead, User, LeadStatus } from "@/types";
import { LeadStatusChip } from "@/components/common/StatusChip";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Users,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Globe,
  Plus,
  Layers,
  Sparkles,
  Zap,
  Plane,
  CreditCard,
  Mail,
  Calendar,
  Clock,
  RotateCcw,
  CheckCircle,
  UserCheck,
  CheckSquare,
  Square,
} from "lucide-react";

import { AgentMonthlyPerformanceCard } from "./AgentMonthlyPerformanceCard";

interface SalesViewProps {
  leads: Lead[];
  currentUser: User;
  users?: User[];
  onSelectLead: (lead: Lead) => void;
  selectedLeadId?: string;
  onOpenIngestModal: () => void;
  onTransitionLead: (leadId: string, targetStatus: LeadStatus) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "7DAYS" | "30DAYS" | "CUSTOM";
type DateFieldTarget = "createdAt" | "departureDate";

export function SalesView({
  leads,
  currentUser,
  users = [],
  onSelectLead,
  selectedLeadId,
  onOpenIngestModal,
  onTransitionLead,
  onRefresh,
}: SalesViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Lead Multi-Select & Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkTargetAgentId, setBulkTargetAgentId] = useState<string>("");
  const [isBulkAssigning, setIsBulkAssigning] = useState<boolean>(false);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);

  // Authority check: Admin & Managers can assign leads to agents
  const canAssignLeads =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN" ||
    currentUser.role === "SALES_MANAGER" ||
    currentUser.role.endsWith("_MANAGER");

  // Filter available agents for assignment
  const salesAgents = useMemo(() => {
    return (users || []).filter(
      (u) =>
        (u.role === "SALES_AGENT" ||
          u.role.endsWith("_AGENT") ||
          u.role.endsWith("_OPERATOR")) &&
        u.isActive
    );
  }, [users]);

  // Date Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [dateField, setDateField] = useState<DateFieldTarget>("createdAt");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Helper to parse date to start of day timestamp
  const getStartOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  };

  const getEndOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy.getTime();
  };

  const filteredLeads = useMemo(() => {
    const now = new Date();
    const todayStart = getStartOfDay(now);
    const todayEnd = getEndOfDay(now);

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStart = getStartOfDay(yesterdayDate);
    const yesterdayEnd = getEndOfDay(yesterdayDate);

    const sevenDaysAgoStart = getStartOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgoStart = getStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

    return leads.filter((lead) => {
      // 0. Strict Agent Row-Level Security: Agent only sees their assigned leads
      if (currentUser.role === "SALES_AGENT" && lead.assignedToId !== currentUser.id) {
        return false;
      }

      // 1. Status Filter
      const matchesStatus = filterStatus === "ALL" || lead.status === filterStatus;

      // 2. Search Query
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, "").trim();
      const matchesSearch =
        !q ||
        (lead.bookingNumber && lead.bookingNumber.toString().includes(cleanQ)) ||
        (lead.bookingId && lead.bookingId.toLowerCase().includes(q)) ||
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        (lead.phone && lead.phone.toLowerCase().includes(q)) ||
        (lead.company && lead.company.toLowerCase().includes(q)) ||
        (lead.bookingDetails?.origin && lead.bookingDetails.origin.toLowerCase().includes(q)) ||
        (lead.bookingDetails?.destination && lead.bookingDetails.destination.toLowerCase().includes(q)) ||
        (lead.bookingDetails?.pnrCode && lead.bookingDetails.pnrCode.toLowerCase().includes(q)) ||
        (lead.bookingDetails?.airline && lead.bookingDetails.airline.toLowerCase().includes(q)) ||
        lead.bookingDetails?.passengers?.some((p) => p.fullName.toLowerCase().includes(q) || p.passportNumber.toLowerCase().includes(q));

      // 3. Date Stamp Filter
      let targetTimestamp: number | null = null;
      if (dateField === "createdAt") {
        targetTimestamp = new Date(lead.createdAt).getTime();
      } else if (dateField === "departureDate" && lead.bookingDetails?.departureDate) {
        targetTimestamp = new Date(lead.bookingDetails.departureDate).getTime();
      }

      let matchesDate = true;
      if (targetTimestamp !== null && !isNaN(targetTimestamp)) {
        if (datePreset === "TODAY") {
          matchesDate = targetTimestamp >= todayStart && targetTimestamp <= todayEnd;
        } else if (datePreset === "YESTERDAY") {
          matchesDate = targetTimestamp >= yesterdayStart && targetTimestamp <= yesterdayEnd;
        } else if (datePreset === "7DAYS") {
          matchesDate = targetTimestamp >= sevenDaysAgoStart && targetTimestamp <= todayEnd;
        } else if (datePreset === "30DAYS") {
          matchesDate = targetTimestamp >= thirtyDaysAgoStart && targetTimestamp <= todayEnd;
        } else if (datePreset === "CUSTOM") {
          if (customStartDate && customEndDate) {
            const start = getStartOfDay(new Date(customStartDate));
            const end = getEndOfDay(new Date(customEndDate));
            matchesDate = targetTimestamp >= start && targetTimestamp <= end;
          } else if (customStartDate) {
            const start = getStartOfDay(new Date(customStartDate));
            matchesDate = targetTimestamp >= start;
          } else if (customEndDate) {
            const end = getEndOfDay(new Date(customEndDate));
            matchesDate = targetTimestamp <= end;
          }
        }
      }

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [leads, filterStatus, searchQuery, datePreset, dateField, customStartDate, customEndDate]);

  const totalPipeline = leads.reduce((sum, l) => sum + l.dealValue, 0);
  const salesWonCount = leads.filter((l) => l.status === "SALE" || l.status === "SUCCESS").length;
  const authPendingCount = leads.filter((l) => l.status === "AUTHENTICATION_SENT" || l.status === "FOLLOW_UP").length;

  const handleResetFilters = () => {
    setFilterStatus("ALL");
    setSearchQuery("");
    setDatePreset("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const isFilterActive = filterStatus !== "ALL" || searchQuery !== "" || datePreset !== "ALL" || customStartDate !== "" || customEndDate !== "";

  // Multi-select helpers
  const allFilteredSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((l) => selectedLeadIds.includes(l.id));
  const someFilteredSelected =
    filteredLeads.some((l) => selectedLeadIds.includes(l.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleSelectLead = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  // Single Lead Assignment Handler
  const handleSingleAssignLead = async (leadId: string, targetAgentId: string) => {
    setAssigningLeadId(leadId);
    try {
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          targetAgentId: targetAgentId === "UNASSIGNED" ? null : targetAgentId,
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Lead assignment failed: " + data.error);
      } else if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Single assign failed:", err);
    } finally {
      setAssigningLeadId(null);
    }
  };

  // Bulk Lead Assignment Handler
  const handleBulkAssignLeads = async () => {
    if (selectedLeadIds.length === 0 || !bulkTargetAgentId) return;
    setIsBulkAssigning(true);
    try {
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          targetAgentId: bulkTargetAgentId === "UNASSIGNED" ? null : bulkTargetAgentId,
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Bulk lead assignment failed: " + data.error);
      } else {
        setSelectedLeadIds([]);
        setBulkTargetAgentId("");
        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (err) {
      console.error("Bulk assign error:", err);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
      {/* Top Section: Individual Sales and Performance Details on a Monthly Basis */}
      <AgentMonthlyPerformanceCard
        leads={leads}
        currentUser={currentUser}
        users={users}
      />

      {/* Primary Toolbar: Search + Stage Filter Buttons */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Booking # (1001), passenger name, passport #, PNR, route (JFK, LHR)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1 text-xs overflow-x-auto">
          {["ALL", "NEW", "FOLLOW_UP", "AUTHENTICATION_SENT", "QUALIFIED", "SALE", "CHARGING", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                filterStatus === st
                  ? "bg-indigo-600 text-white shadow-sm font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Dedicated Date Stamp Filter Toolbar */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[11px] uppercase tracking-wider font-mono">Date:</span>
          </div>

          {/* Date Field Target (Ingested vs Departure) */}
          <div className="flex items-center rounded-md bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
            <button
              onClick={() => setDateField("createdAt")}
              className={`px-2 py-0.5 rounded transition ${
                dateField === "createdAt"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Ingest
            </button>
            <button
              onClick={() => setDateField("departureDate")}
              className={`px-2 py-0.5 rounded transition ${
                dateField === "departureDate"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Flight
            </button>
          </div>

          {/* Quick Date Presets (Horizontally scrollable on small mobile screens) */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "7DAYS", label: "7 Days" },
              { id: "30DAYS", label: "30 Days" },
              { id: "CUSTOM", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id as DatePreset)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap shrink-0 ${
                  datePreset === p.id
                    ? "bg-indigo-950 text-indigo-300 border border-indigo-700/80 font-bold"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers (if CUSTOM selected) */}
          {datePreset === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-indigo-700/60 rounded-md px-2 py-1">
              <span className="text-[10px] text-slate-400 font-mono">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 font-mono">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Lead Count & Reset Action */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <span className="text-[11px] font-mono text-slate-400">
            <strong className="text-white font-bold">{filteredLeads.length}</strong> / {leads.length} Itineraries
          </span>
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition"
              title="Reset all search and date filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating / Sticky Bulk Assignment Toolbar for Admin & Managers */}
      {canAssignLeads && selectedLeadIds.length > 0 && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-700/70 flex flex-wrap items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-200 bg-indigo-900/80 border border-indigo-500/60 px-2.5 py-1 rounded-md shadow-xs">
              <Users className="h-3.5 w-3.5 text-indigo-300" />
              <span>{selectedLeadIds.length} Bookings Selected</span>
            </span>
            <span className="text-xs text-slate-300 hidden md:inline">
              Assign simultaneously to agent:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkTargetAgentId}
              onChange={(e) => setBulkTargetAgentId(e.target.value)}
              className="bg-slate-950 border border-indigo-500/80 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium cursor-pointer shadow-inner"
            >
              <option value="">-- Choose Agent to Assign --</option>
              <option value="UNASSIGNED" className="text-slate-400">
                Unassigned Pool (Reset)
              </option>
              {salesAgents.map((ag) => (
                <option key={ag.id} value={ag.id} className="text-slate-100">
                  {ag.name} (@{ag.username})
                </option>
              ))}
            </select>

            <button
              disabled={!bulkTargetAgentId || isBulkAssigning}
              onClick={handleBulkAssignLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition active:scale-95"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>
                {isBulkAssigning
                  ? "Assigning Leads..."
                  : `Assign ${selectedLeadIds.length} Lead(s)`}
              </span>
            </button>

            <button
              onClick={() => setSelectedLeadIds([])}
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* High-Density Pipeline Lead Datatable */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
            <tr>
              {canAssignLeads && (
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-indigo-400 transition"
                    title={allFilteredSelected ? "Deselect All" : "Select All"}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4 text-indigo-400" />
                    ) : someFilteredSelected ? (
                      <div className="h-4 w-4 rounded border border-indigo-400 bg-indigo-950 flex items-center justify-center">
                        <div className="h-1.5 w-2 bg-indigo-400 rounded-xs" />
                      </div>
                    ) : (
                      <Square className="h-4 w-4 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>
                </th>
              )}
              <th className="py-2.5 px-3 font-semibold">Passenger & PNR</th>
              <th className="py-2.5 px-3 font-semibold">Flight Routing</th>
              <th className="py-2.5 px-3 font-semibold">Stage / Status</th>
              <th className="py-2.5 px-3 font-semibold">Fare Value</th>
              <th className="py-2.5 px-3 font-semibold">Card Security</th>
              <th className="py-2.5 px-3 font-semibold">
                {canAssignLeads ? "Assigned Agent (Change)" : "Assigned Agent"}
              </th>
              <th className="py-2.5 px-3 font-semibold">Date Stamp</th>
              <th className="py-2.5 px-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={canAssignLeads ? 9 : 8} className="py-12 text-center text-slate-500">
                  <Plane className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                  <p className="text-sm font-medium text-slate-400">No flight bookings match your date or search filters</p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-2 text-xs text-indigo-400 hover:underline"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = lead.id === selectedLeadId;
                const isChecked = selectedLeadIds.includes(lead.id);
                const booking = lead.bookingDetails;
                const card = lead.cardDetails;
                const last4 = card?.cardNumber?.slice(-4) || "4242";

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-indigo-950/60 border-l-2 border-indigo-400"
                        : isSelected
                        ? "bg-indigo-950/40 border-l-2 border-indigo-500"
                        : "hover:bg-slate-900/70"
                    }`}
                  >
                    {canAssignLeads && (
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => handleToggleSelectLead(lead.id, e)}
                      >
                        <button
                          type="button"
                          className="text-slate-400 hover:text-indigo-400 transition"
                          title="Select for bulk assignment"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-1.5 py-0.5 rounded shadow-xs">
                          #{lead.bookingNumber || 1001}
                        </span>
                        <span className="truncate max-w-[150px] sm:max-w-none">{lead.name}</span>
                      </div>
                      <div className="text-[11px] text-indigo-300 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400 font-semibold">{booking?.pnrCode || "NX-PNR"}</span>
                        <span>&bull;</span>
                        <span className="text-slate-400 truncate max-w-[130px]">{lead.phone || lead.email}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1">
                        <span>{booking?.origin || "JFK"}</span>
                        <ArrowRight className="h-3 w-3 text-indigo-400" />
                        <span>{booking?.destination || "LHR"}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {booking?.airline} ({booking?.cabinClass})
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <LeadStatusChip status={lead.status} />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(lead.dealValue, lead.currency)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="text-slate-400">•••• {last4}</span>
                        {card?.isAccessGrantedToAgent ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            CLEARANCE
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                            MASKED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3" onClick={(e) => canAssignLeads && e.stopPropagation()}>
                      {canAssignLeads ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={lead.assignedToId || "UNASSIGNED"}
                            disabled={assigningLeadId === lead.id}
                            onChange={(e) => handleSingleAssignLead(lead.id, e.target.value)}
                            className={`text-xs rounded-md px-2 py-1 font-medium transition cursor-pointer border focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[160px] ${
                              lead.assignedToId
                                ? "bg-slate-900 border-slate-700 text-indigo-300 hover:border-indigo-500"
                                : "bg-amber-950/40 border-amber-700/70 text-amber-300 font-semibold hover:border-amber-500"
                            }`}
                          >
                            <option value="UNASSIGNED" className="bg-slate-950 text-slate-400">
                              Unassigned Pool
                            </option>
                            {salesAgents.map((ag) => (
                              <option key={ag.id} value={ag.id} className="bg-slate-950 text-slate-100">
                                {ag.name} (@{ag.username})
                              </option>
                            ))}
                          </select>
                          {assigningLeadId === lead.id && (
                            <span className="text-[10px] text-indigo-400 animate-pulse font-mono">...</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium">
                          {lead.assignedToName || <span className="text-slate-500 italic">Unassigned Pool</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <div className="text-slate-200 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-indigo-400" />
                        <span>{formatDate(lead.createdAt)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Departs: <strong className="text-slate-300">{booking?.departureDate || "Pending"}</strong>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLead(lead);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 rounded border border-indigo-800 transition"
                      >
                        Open Workspace &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
