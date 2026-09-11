import React from "react";
import { LeadStatus, TransactionStatus, TicketStatus, TicketPriority } from "@/types";

export function LeadStatusChip({ status }: { status: LeadStatus }) {
  const map: Record<LeadStatus, { label: string; class: string; dot: string }> = {
    NEW: { label: "NEW INQUIRY", class: "bg-blue-500/10 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
    FOLLOW_UP: { label: "FOLLOW UP", class: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-400" },
    AUTHENTICATION_SENT: { label: "AUTH MAIL SENT", class: "bg-purple-500/15 text-purple-300 border-purple-500/30 animate-pulse", dot: "bg-purple-400" },
    QUALIFIED: { label: "QUALIFIED", class: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", dot: "bg-indigo-400" },
    FINAL: { label: "FINAL / DISPATCH", class: "bg-amber-500/15 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
    SALE: { label: "SALE CONFIRMED", class: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-bold", dot: "bg-emerald-400" },
    CANCELLED: { label: "CANCELLED", class: "bg-slate-500/10 text-slate-400 border-slate-600/30 line-through", dot: "bg-slate-500" },
    CHARGING: { label: "CHARGING QUEUE", class: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", dot: "bg-cyan-400" },
    SUCCESS: { label: "TICKETS ISSUED (WON)", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
    FAILED: { label: "CARD DECLINED", class: "bg-red-500/10 text-red-400 border-red-500/30", dot: "bg-red-400" },
    ARCHIVED: { label: "ARCHIVED", class: "bg-slate-500/10 text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
  };

  const item = map[status] || map.NEW;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide border ${item.class}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}

export function TransactionStatusChip({ status }: { status: TransactionStatus }) {
  const map: Record<TransactionStatus, { label: string; class: string }> = {
    PENDING: { label: "PENDING QUEUE", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    PROCESSING: { label: "IN VERIFICATION", class: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
    SUCCESS: { label: "CAPTURED / SETTLED", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    FAILED: { label: "DECLINED", class: "bg-red-500/15 text-red-400 border-red-500/30" },
    REFUNDED: { label: "REFUNDED", class: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  };

  const item = map[status] || map.PENDING;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${item.class}`}>
      {item.label}
    </span>
  );
}

export function TicketStatusChip({ status, priority }: { status: TicketStatus; priority?: TicketPriority }) {
  const statusMap: Record<TicketStatus, { label: string; class: string }> = {
    OPEN: { label: "OPEN QUEUE", class: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    IN_PROGRESS: { label: "IN PROGRESS", class: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    WAITING_ON_CUSTOMER: { label: "AWAITING CLIENT", class: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    RESOLVED: { label: "RESOLVED", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    CLOSED: { label: "CLOSED", class: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
  };

  const priorityMap: Record<TicketPriority, { class: string }> = {
    LOW: { class: "text-slate-400" },
    MEDIUM: { class: "text-blue-400" },
    HIGH: { class: "text-amber-400 font-semibold" },
    URGENT: { class: "text-red-400 font-bold animate-pulse" },
  };

  const item = statusMap[status] || statusMap.OPEN;

  return (
    <div className="flex items-center gap-1.5">
      {priority && (
        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 ${priorityMap[priority].class}`}>
          {priority}
        </span>
      )}
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${item.class}`}>
        {item.label}
      </span>
    </div>
  );
}
