import React from "react";
import { LeadStatus, TransactionStatus, TicketStatus, TicketPriority } from "@/types";

export function LeadStatusChip({ status }: { status: LeadStatus }) {
  const map: Record<LeadStatus, { label: string; class: string; dot: string }> = {
    NEW: { label: "NEW INQUIRY", class: "bg-blue-50 text-blue-700 border-blue-200 font-medium", dot: "bg-blue-600" },
    FOLLOW_UP: { label: "FOLLOW UP", class: "bg-orange-50 text-orange-700 border-orange-200 font-medium", dot: "bg-orange-600" },
    AUTHENTICATION_SENT: { label: "AUTH MAIL SENT", class: "bg-purple-50 text-purple-700 border-purple-200 animate-pulse font-medium", dot: "bg-purple-600" },
    QUALIFIED: { label: "QUALIFIED", class: "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium", dot: "bg-indigo-600" },
    FINAL: { label: "FINAL / DISPATCH", class: "bg-amber-50 text-amber-800 border-amber-200 font-medium", dot: "bg-amber-600" },
    SALE: { label: "SALE CONFIRMED", class: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold", dot: "bg-emerald-600" },
    CANCELLED: { label: "CANCELLED", class: "bg-slate-100 text-slate-500 border-slate-300 line-through", dot: "bg-slate-400" },
    CHARGING: { label: "CHARGING QUEUE", class: "bg-cyan-50 text-cyan-800 border-cyan-200 font-medium", dot: "bg-cyan-600" },
    SUCCESS: { label: "TICKETS ISSUED (WON)", class: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold", dot: "bg-emerald-600" },
    FAILED: { label: "CARD DECLINED", class: "bg-red-50 text-red-700 border-red-200 font-semibold", dot: "bg-red-600" },
    ARCHIVED: { label: "ARCHIVED", class: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  };

  const item = map[status] || map.NEW;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide border shadow-2xs ${item.class}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}

export function TransactionStatusChip({ status }: { status: TransactionStatus }) {
  const map: Record<TransactionStatus, { label: string; class: string }> = {
    PENDING: { label: "PENDING QUEUE", class: "bg-amber-50 text-amber-800 border-amber-200" },
    PROCESSING: { label: "IN VERIFICATION", class: "bg-cyan-50 text-cyan-800 border-cyan-200" },
    SUCCESS: { label: "CAPTURED / SETTLED", class: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" },
    FAILED: { label: "DECLINED", class: "bg-red-50 text-red-700 border-red-200 font-semibold" },
    REFUNDED: { label: "REFUNDED", class: "bg-purple-50 text-purple-700 border-purple-200" },
  };

  const item = map[status] || map.PENDING;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border shadow-2xs ${item.class}`}>
      {item.label}
    </span>
  );
}

export function TicketStatusChip({ status, priority }: { status: TicketStatus; priority?: TicketPriority }) {
  const statusMap: Record<TicketStatus, { label: string; class: string }> = {
    OPEN: { label: "OPEN QUEUE", class: "bg-blue-50 text-blue-700 border-blue-200" },
    IN_PROGRESS: { label: "IN PROGRESS", class: "bg-amber-50 text-amber-800 border-amber-200" },
    WAITING_ON_CUSTOMER: { label: "AWAITING CLIENT", class: "bg-purple-50 text-purple-700 border-purple-200" },
    RESOLVED: { label: "RESOLVED", class: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" },
    CLOSED: { label: "CLOSED", class: "bg-slate-100 text-slate-600 border-slate-300" },
  };

  const priorityMap: Record<TicketPriority, { class: string }> = {
    LOW: { class: "text-slate-600" },
    MEDIUM: { class: "text-blue-700 font-medium" },
    HIGH: { class: "text-amber-800 font-semibold" },
    URGENT: { class: "text-red-700 font-bold animate-pulse" },
  };

  const item = statusMap[status] || statusMap.OPEN;

  return (
    <div className="flex items-center gap-1.5">
      {priority && (
        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium ${priorityMap[priority].class}`}>
          {priority}
        </span>
      )}
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border shadow-2xs ${item.class}`}>
        {item.label}
      </span>
    </div>
  );
}
