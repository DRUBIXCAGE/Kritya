"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneForwarded,
  Search,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Clock,
  FileText,
} from "lucide-react";
import { CallLog, User as CrmUser } from "@/types";

interface CallHistoryViewProps {
  currentUser: CrmUser;
  users?: CrmUser[];
  onInitiateCall: (phoneNumber: string) => void;
  onSelectLeadById?: (leadId: string) => void;
  onOpenDispositionModalForCall?: (call: CallLog) => void;
}

export function CallHistoryView({
  currentUser,
  users,
  onInitiateCall,
  onSelectLeadById,
  onOpenDispositionModalForCall,
}: CallHistoryViewProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    answeredCalls: 0,
    totalDurationSeconds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedExtension, setSelectedExtension] = useState<string>(
    currentUser.rcExtension || "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const extParam = selectedExtension === "ALL" ? "" : `&extension=${selectedExtension}`;
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : "";
      const res = await fetch(`/api/ringcentral/calls?_t=${Date.now()}${extParam}${searchParam}`);
      const data = await res.json();
      if (data.success) {
        setCallLogs(data.callLogs || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch calls:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [selectedExtension, searchQuery]);

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds) return "0s";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleTriggerTestCall = async () => {
    try {
      const ext = selectedExtension !== "ALL" ? selectedExtension : (currentUser.rcExtension || "101");
      await fetch("/api/ringcentral/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INCOMING_CALL",
          extension: ext,
          callerNumber: "+1 (555) 781-9920",
          callerName: "Emily Watson",
        }),
      });
      fetchCalls();
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
      {/* Clean Header & Compact Summary */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Phone className="h-4 w-4 text-indigo-600" />
              <span>Call Records & Extension Logs</span>
            </h1>
            <p className="text-xs text-slate-500">
              Calls recorded and tracked by agent extension.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerTestCall}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Test Call</span>
            </button>

            <button
              onClick={fetchCalls}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Clean 1-Row Stats Strip */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl flex-wrap">
          <div>
            <span className="text-slate-400 mr-1.5">Total:</span>
            <strong className="text-slate-900 font-mono">{stats.totalCalls}</strong>
          </div>
          <div className="h-3 w-px bg-slate-300" />
          <div>
            <span className="text-slate-400 mr-1.5">Inbound:</span>
            <strong className="text-blue-700 font-mono">{stats.inboundCalls}</strong>
          </div>
          <div className="h-3 w-px bg-slate-300" />
          <div>
            <span className="text-slate-400 mr-1.5">Outbound:</span>
            <strong className="text-emerald-700 font-mono">{stats.outboundCalls}</strong>
          </div>
          <div className="h-3 w-px bg-slate-300" />
          <div>
            <span className="text-slate-400 mr-1.5">Talk Time:</span>
            <strong className="text-indigo-700 font-mono">{formatDuration(stats.totalDurationSeconds)}</strong>
          </div>
        </div>

        {/* Search & Extension Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone number or notes..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter Extension:</span>
            <select
              value={selectedExtension}
              onChange={(e) => setSelectedExtension(e.target.value)}
              className="text-xs font-mono font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            >
              <option value="ALL">All Extensions</option>
              <option value="100">Ext 100 - Alex Thorne</option>
              <option value="101">Ext 101 - Sarah Chen</option>
              <option value="102">Ext 102 - Marcus Brooks</option>
              <option value="103">Ext 103 - Rachel Vance</option>
              <option value="104">Ext 104 - David Miller</option>
              <option value="105">Ext 105 - Elena Rostova</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clean Call Log Table */}
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Agent Ext</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Disposition</th>
                  <th className="py-3 px-4">Booking</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading call logs...
                    </td>
                  </tr>
                ) : callLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No calls recorded for this extension.
                    </td>
                  </tr>
                ) : (
                  callLogs.map((c) => {
                    const isInbound = c.direction === "INBOUND";
                    const customerPhone = isInbound ? c.callerNumber : c.calleeNumber;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                          {formatDate(c.startTime)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                            Ext {c.agentExtension}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isInbound
                                ? "bg-blue-50 text-blue-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isInbound ? <PhoneIncoming className="h-2.5 w-2.5" /> : <PhoneOutgoing className="h-2.5 w-2.5" />}
                            <span>{isInbound ? "Inbound" : "Outbound"}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                          {customerPhone}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                          {formatDuration(c.durationSeconds)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.disposition ? (
                            <span className="inline-block bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                              {c.disposition.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Inquiry</span>
                          )}
                          {c.transferredToExtension && (
                            <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono">
                              <PhoneForwarded className="h-2.5 w-2.5" />
                              Ext {c.transferredToExtension}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.leadBookingNumber || c.leadId ? (
                            <button
                              onClick={() => c.leadId && onSelectLeadById && onSelectLeadById(c.leadId)}
                              className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-indigo-700 hover:text-indigo-900"
                            >
                              <span>#{c.leadBookingNumber || "Lead"}</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onOpenDispositionModalForCall && (
                              <button
                                onClick={() => onOpenDispositionModalForCall(c)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Call details & notes"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onInitiateCall(customerPhone)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Call customer"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </button>
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
