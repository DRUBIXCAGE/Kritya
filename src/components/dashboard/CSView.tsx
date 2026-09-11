"use client";

import React, { useState } from "react";
import { Ticket, Customer, User, TicketStatus } from "@/types";
import { TicketStatusChip } from "@/components/common/StatusChip";
import { formatRelativeTime, calculateSlaStatus } from "@/lib/utils";
import {
  LifeBuoy,
  Clock,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Building,
  HeartHandshake,
  ArrowRight,
  ShieldAlert,
  Send,
  Sparkles,
  FileSpreadsheet,
  Eye,
} from "lucide-react";

interface CSViewProps {
  tickets: Ticket[];
  customers: Customer[];
  currentUser: User;
  onUpdateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
}

export function CSView({
  tickets,
  customers,
  currentUser,
  onUpdateTicketStatus,
}: CSViewProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>(
    tickets[0]?.id
  );
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isUpdating, setIsUpdating] = useState(false);
  const [mobileTab, setMobileTab] = useState<"tickets" | "detail">("tickets");

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];
  const selectedCustomer = customers.find((c) => c.id === selectedTicket?.customerId);

  const filteredTickets = tickets.filter((t) => {
    if (filterType === "ALL") return true;
    if (filterType === "ONBOARDING") return t.type === "ONBOARDING";
    if (filterType === "BREACHED") return t.isSlaBreached;
    return t.status === filterType;
  });

  const openTickets = tickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length;
  const onboardingTickets = tickets.filter((t) => t.type === "ONBOARDING").length;

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      await onUpdateTicketStatus(selectedTicket.id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  const isCsRole =
    currentUser.role === "CS_MANAGER" ||
    currentUser.role === "CS_AGENT" ||
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
      {/* Top Metric Strip */}
      <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 border-b border-slate-800 bg-slate-900/50">
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active SLA Tickets</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">{openTickets} Open</div>
          <span className="text-[10px] text-amber-400 mt-0.5 block">SLA resolution</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Onboarding Queue</span>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-300 mt-1">
            {onboardingTickets} Accounts
          </div>
          <span className="text-[10px] text-indigo-400/80 mt-0.5 block">Post-charge VIP handoff</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Accounts</span>
            <Building className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
            {customers.length} Clients
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 block">Healthy account tiering</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">CS Specialist</span>
            <HeartHandshake className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-1 truncate">
            {currentUser.name}
          </div>
          <span className="text-[10px] text-purple-300 font-mono mt-0.5 block">
            {isCsRole ? "✓ ASSIGNED AGENT" : "READ-ONLY"}
          </span>
        </div>
      </div>

      {/* Mobile Toggle Strip (screens < 1024px) */}
      <div className="lg:hidden flex border-b border-slate-800 bg-slate-900/90 p-1">
        <button
          onClick={() => setMobileTab("tickets")}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "tickets"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Tickets Roster</span>
        </button>
        <button
          onClick={() => setMobileTab("detail")}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "detail"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Ticket Workdesk</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Ticket Roster Table */}
        <div
          className={`w-full lg:w-3/5 border-r border-slate-800 flex-col bg-slate-950 overflow-hidden ${
            mobileTab === "detail" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Ticket Filter Bar */}
          <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Tickets & Concierge Requests</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {filteredTickets.length}
              </span>
            </div>

            <div className="flex gap-1 text-xs overflow-x-auto">
              {["ALL", "ONBOARDING", "OPEN", "IN_PROGRESS", "RESOLVED", "BREACHED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                    filterType === tab
                      ? "bg-indigo-600 text-white shadow-sm font-bold"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Subject & Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Priority</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">SLA Due</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTickets.map((ticket) => {
                  const isSelected = ticket.id === selectedTicket?.id;
                  const sla = calculateSlaStatus(ticket.slaDeadline);

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setMobileTab("detail");
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-indigo-950/40 border-l-2 border-indigo-500" : "hover:bg-slate-900/70"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
                          {ticket.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {ticket.customerName} &bull; {ticket.id}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            ticket.priority === "URGENT"
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : ticket.priority === "HIGH"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-slate-900 text-slate-400 border border-slate-800"
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <TicketStatusChip status={ticket.status} />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] hidden sm:table-cell">
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] ${sla.badgeClass}`}>
                          {sla.timeLeft}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] text-right">
                        {formatRelativeTime(ticket.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Ticket Detail Workdesk */}
        <div
          className={`w-full lg:w-2/5 p-3 sm:p-4 flex-col bg-slate-900/30 overflow-y-auto space-y-4 ${
            mobileTab === "tickets" ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedTicket ? (
            <>
              {/* Ticket Overview Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase">
                      {selectedTicket.type} TICKET
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                      {selectedTicket.title}
                    </h3>
                  </div>
                  <TicketStatusChip status={selectedTicket.status} />
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Customer:</span>
                    <strong className="text-slate-200">{selectedTicket.customerName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Assigned Specialist:</span>
                    <strong className="text-slate-200">{selectedTicket.assignedToName || "Unassigned"}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>SLA Deadline:</span>
                    <span className="font-mono text-indigo-300">{formatRelativeTime(selectedTicket.slaDeadline)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Status Update Actions */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-200 block">Update Ticket Status</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isUpdating}
                    onClick={() => handleStatusChange("IN_PROGRESS")}
                    className="py-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 font-semibold text-xs transition active:scale-95"
                  >
                    Set In Progress
                  </button>
                  <button
                    disabled={isUpdating}
                    onClick={() => handleStatusChange("RESOLVED")}
                    className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Resolve Ticket</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <LifeBuoy className="h-10 w-10 mb-2 stroke-[1.5] text-slate-700" />
              <p className="text-xs">Select a support ticket</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
