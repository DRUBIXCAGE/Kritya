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
  ChevronUp,
  ChevronDown,
  BarChart3,
  EyeOff,
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

  // Show/Hide Summarized Performance Dashboard state (persisted in localStorage)
  const [showSummaryDashboard, setShowSummaryDashboard] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kritya_show_summary_dashboard");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const handleToggleSummaryDashboard = (explicitVal?: boolean) => {
    setShowSummaryDashboard((prev) => {
      const nextVal = typeof explicitVal === "boolean" ? explicitVal : !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("kritya_show_summary_dashboard", String(nextVal));
      }
      return nextVal;
    });
  };

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
    <div className="flex-1 min-h-0 flex flex-col min-w-0 bg-slate-50 xl:overflow-hidden">
      {/* Top Section: Individual Sales and Performance Details on a Monthly Basis */}
      {showSummaryDashboard && (
        <AgentMonthlyPerformanceCard
          leads={leads}
          currentUser={currentUser}
          users={users}
          onHide={() => handleToggleSummaryDashboard(false)}
        />
      )}

      {/* Primary Toolbar: Search + Stage Filter Buttons */}
      <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white">
        <div className="flex items-center gap-2 flex-1 max-w-lg w-full">
          {/* Toggle Summarized Dashboard Button */}
          <button
            type="button"
            onClick={() => handleToggleSummaryDashboard()}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 active:scale-95 border ${
              showSummaryDashboard
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300 shadow-xs"
            }`}
            title={showSummaryDashboard ? "Hide performance summary dashboard" : "Show performance summary dashboard"}
          >
            {showSummaryDashboard ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Hide Dashboard</span>
                <span className="sm:hidden">Hide</span>
              </>
            ) : (
              <>
                <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Show Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </>
            )}
          </button>

          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Booking # (1001), passenger name, passport #, PNR, route (JFK, LHR)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md bg-slate-50 border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1 text-xs overflow-x-auto no-scrollbar touch-scroll max-w-full pb-1 md:pb-0">
          {["ALL", "NEW", "FOLLOW_UP", "AUTHENTICATION_SENT", "QUALIFIED", "SALE", "CHARGING", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap shrink-0 ${
                filterStatus === st
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Dedicated Date Stamp Filter Toolbar */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-slate-600 font-medium">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-[11px] uppercase tracking-wider font-mono font-bold">Date:</span>
          </div>

          {/* Date Field Target (Ingested vs Departure) */}
          <div className="flex items-center rounded-md bg-slate-200/80 p-0.5 text-[11px]">
            <button
              onClick={() => setDateField("createdAt")}
              className={`px-2 py-0.5 rounded transition ${
                dateField === "createdAt"
                  ? "bg-white text-indigo-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ingest
            </button>
            <button
              onClick={() => setDateField("departureDate")}
              className={`px-2 py-0.5 rounded transition ${
                dateField === "departureDate"
                  ? "bg-white text-indigo-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Flight
            </button>
          </div>

          {/* Quick Date Presets (Horizontally scrollable on small mobile screens) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar touch-scroll max-w-full pb-1 sm:pb-0">
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
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-300 font-bold shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers (if CUSTOM selected) */}
          {datePreset === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-1.5 bg-white border border-indigo-200 rounded-md px-2 py-1 shadow-xs">
              <span className="text-[10px] text-slate-500 font-mono">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 font-mono">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Lead Count & Reset Action */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
          <span className="text-[11px] font-mono text-slate-600">
            <strong className="text-slate-900 font-bold">{filteredLeads.length}</strong> / {leads.length} Itineraries
          </span>
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 border border-slate-200 transition"
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
        <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md shadow-xs">
              <Users className="h-3.5 w-3.5 text-indigo-700" />
              <span>{selectedLeadIds.length} Bookings Selected</span>
            </span>
            <span className="text-xs text-indigo-900 font-medium hidden md:inline">
              Assign simultaneously to agent:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkTargetAgentId}
              onChange={(e) => setBulkTargetAgentId(e.target.value)}
              className="bg-white border border-indigo-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer shadow-xs"
            >
              <option value="">-- Choose Agent to Assign --</option>
              <option value="UNASSIGNED" className="text-slate-500">
                Unassigned Pool (Reset)
              </option>
              {salesAgents.map((ag) => (
                <option key={ag.id} value={ag.id} className="text-slate-800">
                  {ag.name} (@{ag.username})
                </option>
              ))}
            </select>

            <button
              disabled={!bulkTargetAgentId || isBulkAssigning}
              onClick={handleBulkAssignLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition active:scale-95"
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
              className="px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs transition font-medium shadow-xs"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* High-Density Pipeline Lead Datatable */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto touch-scroll">
        <table className="w-full min-w-[940px] text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 sticky top-0 border-b border-slate-200 z-10 font-semibold">
            <tr>
              {canAssignLeads && (
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-indigo-600 transition"
                    title={allFilteredSelected ? "Deselect All" : "Select All"}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4 text-indigo-600" />
                    ) : someFilteredSelected ? (
                      <div className="h-4 w-4 rounded border border-indigo-500 bg-indigo-50 flex items-center justify-center">
                        <div className="h-1.5 w-2 bg-indigo-600 rounded-xs" />
                      </div>
                    ) : (
                      <Square className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                </th>
              )}
              <th className="py-2.5 px-3 font-semibold">Passenger & PNR</th>
              <th className="py-2.5 px-3 font-semibold">Flight Routing</th>
              <th className="py-2.5 px-3 font-semibold">Stage / Status</th>
              <th className="py-2.5 px-3 font-semibold">Pricing / Sale Price</th>
              <th className="py-2.5 px-3 font-semibold">
                {canAssignLeads ? "Assigned Agent (Change)" : "Assigned Agent"}
              </th>
              <th className="py-2.5 px-3 font-semibold">Date Stamp</th>
              <th className="py-2.5 px-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={canAssignLeads ? 8 : 7} className="py-12 text-center text-slate-500">
                  <Plane className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No flight bookings match your date or search filters</p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-2 text-xs text-indigo-600 hover:underline font-semibold"
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

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-indigo-50/80 border-l-2 border-indigo-600"
                        : isSelected
                        ? "bg-slate-100/70 border-l-2 border-indigo-500"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {canAssignLeads && (
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => handleToggleSelectLead(lead.id, e)}
                      >
                        <button
                          type="button"
                          className="text-slate-400 hover:text-indigo-600 transition"
                          title="Select for bulk assignment"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded shadow-xs">
                          #{lead.bookingNumber || 1001}
                        </span>
                        <span className="truncate max-w-[150px] sm:max-w-none">{lead.name}</span>
                      </div>
                      <div className="text-[11px] text-indigo-700 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-600 font-semibold">{booking?.pnrCode || "NX-PNR"}</span>
                        <span>&bull;</span>
                        <span className="text-slate-500 truncate max-w-[130px]">{lead.phone || lead.email}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1">
                        <span>{booking?.origin || "JFK"}</span>
                        <ArrowRight className="h-3 w-3 text-indigo-600" />
                        <span>{booking?.destination || "LHR"}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {booking?.airline} ({booking?.cabinClass})
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <LeadStatusChip status={lead.status} />
                    </td>
                    <td className="py-2.5 px-3">
                      {(() => {
                        const isConfirmedOrCompleted = ["SALE", "CHARGING", "SUCCESS"].includes(lead.status);

                        if (isConfirmedOrCompleted) {
                          // Confirmed or completed lead must show ONLY sale price
                          const finalSalePrice = lead.salePrice || lead.dealValue || 0;
                          return (
                            <div className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                              {formatCurrency(finalSalePrice, lead.currency)}
                            </div>
                          );
                        }

                        // Unconfirmed / in-progress leads: Ingested ticket price + agent sale price quote & MCO
                        const tp = lead.ticketPrice ?? 0;
                        const hasSalePrice = typeof lead.salePrice === "number" && lead.salePrice > 0;
                        const sp = hasSalePrice ? lead.salePrice! : 0;
                        const mco = hasSalePrice ? (lead.mco !== undefined ? lead.mco : sp - tp) : undefined;

                        return (
                          <div className="space-y-1">
                            {hasSalePrice ? (
                              <>
                                <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-900">
                                  <span className="text-[10px] text-slate-500 font-normal">Sale:</span>
                                  <span>{formatCurrency(sp, lead.currency)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                                  <span>Ticket: {formatCurrency(tp, lead.currency)}</span>
                                  <span>&bull;</span>
                                  <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1 py-0.2 rounded shadow-xs">
                                    MCO: {mco! >= 0 ? `+${formatCurrency(mco!, lead.currency)}` : `-${formatCurrency(Math.abs(mco!), lead.currency)}`}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="text-[11px] font-mono font-semibold text-slate-700">
                                  Ticket: {formatCurrency(tp, lead.currency)}
                                </div>
                                <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Awaiting Sale Price
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                                ? "bg-slate-50 border-slate-300 text-indigo-700 hover:border-indigo-500"
                                : "bg-amber-50 border-amber-300 text-amber-800 font-semibold hover:border-amber-500"
                            }`}
                          >
                            <option value="UNASSIGNED" className="bg-white text-slate-500">
                              Unassigned Pool
                            </option>
                            {salesAgents.map((ag) => (
                              <option key={ag.id} value={ag.id} className="bg-white text-slate-800">
                                {ag.name} (@{ag.username})
                              </option>
                            ))}
                          </select>
                          {assigningLeadId === lead.id && (
                            <span className="text-[10px] text-indigo-600 animate-pulse font-mono font-bold">...</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-800 font-medium">
                          {lead.assignedToName || <span className="text-slate-400 italic">Unassigned Pool</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <div className="text-slate-800 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-indigo-600" />
                        <span>{formatDate(lead.createdAt)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Departs: <strong className="text-slate-800">{booking?.departureDate || "Pending"}</strong>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLead(lead);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition shadow-xs"
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
