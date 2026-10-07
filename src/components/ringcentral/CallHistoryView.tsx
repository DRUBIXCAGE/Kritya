"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  PhoneForwarded,
  User,
  Clock,
  Search,
  Filter,
  Calendar,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Volume2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { CallLog, User as CrmUser, Lead } from "@/types";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";

interface CallHistoryViewProps {
  currentUser: CrmUser;
  users: CrmUser[];
  onSelectLeadById?: (leadId: string) => void;
  onInitiateCall?: (targetNumber: string) => void;
  onOpenDispositionModalForCall?: (call: CallLog) => void;
}

export function CallHistoryView({
  currentUser,
  users,
  onSelectLeadById,
  onInitiateCall,
  onOpenDispositionModalForCall,
}: CallHistoryViewProps) {
  const isManagerOrAdmin =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN" ||
    currentUser.role.endsWith("_MANAGER");

  const [selectedExtension, setSelectedExtension] = useState<string>(
    isManagerOrAdmin ? "ALL" : currentUser.rcExtension || "101"
  );
  const [directionFilter, setDirectionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<{
    totalCalls: number;
    inboundCalls: number;
    outboundCalls: number;
    answeredCalls: number;
    missedCalls: number;
    totalDurationSeconds: number;
    avgDurationSeconds: number;
  }>({
    totalCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    totalDurationSeconds: 0,
    avgDurationSeconds: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCallDetail, setSelectedCallDetail] = useState<CallLog | null>(null);

  const fetchCalls = async () => {
    setIsLoading(true);
    try {
      const extQuery = selectedExtension !== "ALL" ? `extension=${selectedExtension}&` : "";
      const dirQuery = directionFilter !== "ALL" ? `direction=${directionFilter}&` : "";
      const statQuery = statusFilter !== "ALL" ? `status=${statusFilter}&` : "";
      const searchParam = searchQuery.trim() ? `search=${encodeURIComponent(searchQuery.trim())}&` : "";

      const res = await fetch(`/api/ringcentral/calls?${extQuery}${dirQuery}${statQuery}${searchParam}`);
      const data = await res.json();
      if (data.success) {
        setCallLogs(data.callLogs || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch RingCentral call logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [selectedExtension, directionFilter, statusFilter, searchQuery]);

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds) return "0s";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Trigger test call
  const handleTriggerTestCall = async () => {
    try {
      const ext = selectedExtension !== "ALL" ? selectedExtension : currentUser.rcExtension || "101";
      await fetch("/api/ringcentral/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INCOMING_CALL",
          extension: ext,
          callerNumber: "+1 (555) 893-4421",
          callerName: "Marcus Sterling",
        }),
      });
      fetchCalls();
    } catch (err) {
      console.error("Test call trigger failed:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Phone className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  RingCentral Telephony & Call Logs
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Extension Logs
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All inbound and outbound calls tracked and stored with respect to agent extensions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerTestCall}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-xs"
              title="Simulate an incoming test call to the selected extension"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Simulate Inbound Call</span>
            </button>

            <button
              onClick={fetchCalls}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Refresh Calls"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-slate-500">Total Calls</span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">{stats.totalCalls}</p>
            <span className="text-[10px] text-slate-400">Recorded on system</span>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-blue-700">Inbound Calls</span>
            <p className="text-xl font-bold font-mono text-blue-900 mt-1">{stats.inboundCalls}</p>
            <span className="text-[10px] text-blue-600">Answered by agent</span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-emerald-700">Outbound Calls</span>
            <p className="text-xl font-bold font-mono text-emerald-900 mt-1">{stats.outboundCalls}</p>
            <span className="text-[10px] text-emerald-600">Client dials</span>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-indigo-700">Total Talk Time</span>
            <p className="text-xl font-bold font-mono text-indigo-900 mt-1">{formatDuration(stats.totalDurationSeconds)}</p>
            <span className="text-[10px] text-indigo-600">Across extensions</span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-amber-700">Avg Call Duration</span>
            <p className="text-xl font-bold font-mono text-amber-900 mt-1">{formatDuration(stats.avgDurationSeconds)}</p>
            <span className="text-[10px] text-amber-600">Per conversation</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Extension selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Extension:</span>
            <select
              value={selectedExtension}
              onChange={(e) => setSelectedExtension(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-indigo-500"
            >
              {isManagerOrAdmin && <option value="ALL">All Extensions</option>}
              {users
                .filter((u) => u.rcExtension)
                .map((u) => (
                  <option key={u.id} value={u.rcExtension}>
                    Ext {u.rcExtension} - {u.name} ({u.role})
                  </option>
                ))}
            </select>
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Direction:</span>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-indigo-500"
            >
              <option value="ALL">All Directions</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="ANSWERED">Answered</option>
              <option value="MISSED">Missed</option>
              <option value="RINGING">Ringing</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phone, agent, notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Call Logs Table */}
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Agent (Extension)</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Customer Phone</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Call Disposition</th>
                  <th className="py-3 px-4">Linked CRM Lead</th>
                  <th className="py-3 px-4">Discussion Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {callLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      {isLoading ? "Loading calls..." : "No call logs found matching current filters."}
                    </td>
                  </tr>
                ) : (
                  callLogs.map((c) => {
                    const isInbound = c.direction === "INBOUND";
                    const customerPhone = isInbound ? c.callerNumber : c.calleeNumber;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{formatDate(c.startTime)}</p>
                          <p className="text-[10px] text-slate-400">{formatRelativeTime(c.startTime)}</p>
                        </td>

                        {/* Agent & Extension */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                              Ext {c.agentExtension}
                            </span>
                            <span className="font-medium text-slate-800">{c.agentName}</span>
                          </div>
                        </td>

                        {/* Direction */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isInbound
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {isInbound ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
                            <span>{isInbound ? "Inbound" : "Outbound"}</span>
                          </span>
                        </td>

                        {/* Customer Phone */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-slate-900">
                          {customerPhone}
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-700">
                          {formatDuration(c.durationSeconds)}
                        </td>

                        {/* Disposition & Transfer */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {c.disposition ? (
                              <span className="inline-block bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                                {c.disposition.replace(/_/g, " ")}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Pending disposition</span>
                            )}
                            {c.transferredToExtension && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">
                                <PhoneForwarded className="h-2.5 w-2.5" />
                                <span>Transferred to Ext {c.transferredToExtension}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Linked Lead */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {c.leadBookingNumber || c.leadId ? (
                            <button
                              onClick={() => c.leadId && onSelectLeadById && onSelectLeadById(c.leadId)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-bold text-[11px] border border-indigo-200 transition-colors"
                            >
                              <span>Booking #{c.leadBookingNumber || "View"}</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Unlinked</span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="truncate text-slate-600 text-xs" title={c.notes}>
                            {c.notes || <span className="text-slate-400 italic">No notes</span>}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {onInitiateCall && (
                              <button
                                onClick={() => onInitiateCall(customerPhone)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Redial via RingCentral"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {onOpenDispositionModalForCall && (
                              <button
                                onClick={() => onOpenDispositionModalForCall(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Edit Lead & Call Details"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
