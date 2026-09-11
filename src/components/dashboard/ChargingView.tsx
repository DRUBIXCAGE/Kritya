"use client";

import React, { useState } from "react";
import { Transaction, User, Lead } from "@/types";
import { TransactionStatusChip } from "@/components/common/StatusChip";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
  FileSpreadsheet,
  Eye,
} from "lucide-react";

interface ChargingViewProps {
  transactions: Transaction[];
  leads: Lead[];
  currentUser: User;
  onProcessTransaction: (
    txnId: string,
    action: "CAPTURE" | "DECLINE",
    options?: { failureReason?: string }
  ) => Promise<void>;
  onRefresh: () => void;
}

export function ChargingView({
  transactions,
  leads,
  currentUser,
  onProcessTransaction,
  onRefresh,
}: ChargingViewProps) {
  const [selectedTxnId, setSelectedTxnId] = useState<string | undefined>(
    transactions[0]?.id
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "SUCCESS" | "FAILED">("ALL");
  const [mobileTab, setMobileTab] = useState<"queue" | "desk">("queue");

  const selectedTxn = transactions.find((t) => t.id === selectedTxnId) || transactions[0];
  const associatedLead = leads.find((l) => l.id === selectedTxn?.leadId);

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PENDING") return t.status === "PENDING" || t.status === "PROCESSING";
    return t.status === activeTab;
  });

  const totalSettled = transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingVolume = transactions
    .filter((t) => t.status === "PENDING" || t.status === "PROCESSING")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleAction = async (action: "CAPTURE" | "DECLINE") => {
    if (!selectedTxn) return;
    setIsProcessing(true);
    try {
      await onProcessTransaction(selectedTxn.id, action);
    } finally {
      setIsProcessing(false);
    }
  };

  const isChargingRole =
    currentUser.role === "CHARGING_MANAGER" ||
    currentUser.role === "CHARGING_OPERATOR" ||
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
      {/* Top Metric Strip */}
      <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 border-b border-slate-800 bg-slate-900/50">
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Settled Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalSettled)}
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-0.5 block">Automated CS handoffs triggered</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Pending Financial Queue</span>
            <CreditCard className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300 mt-1">
            {formatCurrency(pendingVolume)}
          </div>
          <span className="text-[10px] text-cyan-400/80 mt-0.5 block">Awaiting 3DS / ACH settlement</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Operator Authority</span>
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-1 flex items-center gap-1.5 truncate">
            <span>{currentUser.name}</span>
          </div>
          <span className="text-[10px] text-indigo-300 font-mono mt-0.5 block">
            {isChargingRole ? "✓ AUTHORIZED TO SETTLE" : "⚠️ READ-ONLY AUDIT MODE"}
          </span>
        </div>
      </div>

      {/* Mobile Toggle Strip (screens < 1024px) */}
      <div className="lg:hidden flex border-b border-slate-800 bg-slate-900/90 p-1">
        <button
          onClick={() => setMobileTab("queue")}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "queue"
              ? "bg-cyan-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Transactions Queue</span>
        </button>
        <button
          onClick={() => setMobileTab("desk")}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "desk"
              ? "bg-cyan-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Settlement Desk</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Financial Queue Table */}
        <div
          className={`w-full lg:w-3/5 border-r border-slate-800 flex-col bg-slate-950 overflow-hidden ${
            mobileTab === "desk" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Queue Filter Tabs */}
          <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Transactions Queue</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {filteredTransactions.length} Total
              </span>
            </div>

            <div className="flex gap-1 text-xs overflow-x-auto">
              {(["ALL", "PENDING", "SUCCESS", "FAILED"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-cyan-600 text-white shadow-sm font-bold"
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
                  <th className="py-2.5 px-3 font-semibold">Client / Account</th>
                  <th className="py-2.5 px-3 font-semibold">Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">Payment Method</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((txn) => {
                  const isSelected = txn.id === selectedTxn?.id;
                  return (
                    <tr
                      key={txn.id}
                      onClick={() => {
                        setSelectedTxnId(txn.id);
                        setMobileTab("desk");
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-cyan-950/40 border-l-2 border-cyan-500" : "hover:bg-slate-900/70"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-100">{txn.leadName || "Enterprise Account"}</div>
                        <div className="text-[10px] font-mono text-slate-500">{txn.id}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(txn.amount, txn.currency)}
                      </td>
                      <td className="py-2.5 px-3">
                        <TransactionStatusChip status={txn.status} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] hidden sm:table-cell">
                        {txn.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] text-right">
                        {formatRelativeTime(txn.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: 6-Point Verification Desk & One-Click Settlement Action */}
        <div
          className={`w-full lg:w-2/5 p-3 sm:p-4 flex-col bg-slate-900/30 overflow-y-auto space-y-4 ${
            mobileTab === "queue" ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedTxn ? (
            <>
              {/* Selected Txn Summary */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Transaction ID</span>
                    <h3 className="text-sm font-bold text-white font-mono">{selectedTxn.id}</h3>
                    <div className="text-xs text-slate-300 mt-0.5">{selectedTxn.leadName}</div>
                  </div>
                  <TransactionStatusChip status={selectedTxn.status} />
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Charge Amount</span>
                    <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                      {formatCurrency(selectedTxn.amount, selectedTxn.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Gateway Reference</span>
                    <div className="text-xs font-mono text-slate-200">
                      {selectedTxn.gatewayTxnId || "Awaiting Capture"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6-Point Financial Risk & Verification Checklist */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    6-Point Card Verification Checklist
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                    Fraud Score: {selectedTxn.verificationChecklist?.fraudRiskScore || 2}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Identity & PNR Matched</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Funds Available</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">AVS Address Verified</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">CVV Cryptogram Match</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">PCI DSS Compliance Cleared</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Manager Access Logged</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Settlement Action Trigger */}
              {selectedTxn.status === "PENDING" || selectedTxn.status === "PROCESSING" ? (
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-200 block">Financial Settlement Action</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Capturing will settle funds via the payment gateway, change the lead status to <strong>SUCCESS</strong>, and dispatch an automated onboarding ticket to Customer Service.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      disabled={isProcessing || !isChargingRole}
                      onClick={() => handleAction("CAPTURE")}
                      className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isProcessing ? "Settling..." : "Capture & Dispatch"}</span>
                    </button>
                    <button
                      disabled={isProcessing || !isChargingRole}
                      onClick={() => handleAction("DECLINE")}
                      className="px-4 py-2.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-semibold text-xs transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                  <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>TRANSACTION SETTLED</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Processed by {selectedTxn.processedByName || "Charging Specialist"}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <CreditCard className="h-10 w-10 mb-2 stroke-[1.5] text-slate-700" />
              <p className="text-xs">Select a transaction from the queue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
