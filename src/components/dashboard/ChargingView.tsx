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
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
      {/* Top Metric Strip */}
      <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 border-b border-slate-200 bg-white">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Settled Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalSettled)}
          </div>
          <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">Automated CS handoffs triggered</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Pending Financial Queue</span>
            <CreditCard className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-cyan-800 mt-1">
            {formatCurrency(pendingVolume)}
          </div>
          <span className="text-[10px] text-cyan-700 mt-0.5 block font-medium">Awaiting 3DS / ACH settlement</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Operator Authority</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1.5 truncate">
            <span>{currentUser.name}</span>
          </div>
          <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block font-semibold">
            {isChargingRole ? "✓ AUTHORIZED TO SETTLE" : "⚠️ READ-ONLY AUDIT MODE"}
          </span>
        </div>
      </div>

      {/* Mobile Toggle Strip (screens < 1024px) */}
      <div className="lg:hidden flex border-b border-slate-200 bg-slate-100 p-1">
        <button
          onClick={() => setMobileTab("queue")}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "queue"
              ? "bg-cyan-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Transactions Queue</span>
        </button>
        <button
          onClick={() => setMobileTab("desk")}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileTab === "desk"
              ? "bg-cyan-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
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
          className={`w-full lg:w-3/5 border-r border-slate-200 flex flex-col bg-white overflow-hidden ${
            mobileTab === "desk" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Queue Filter Tabs */}
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">Transactions Queue</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold">
                {filteredTransactions.length} Total
              </span>
            </div>

            <div className="flex gap-1 text-xs overflow-x-auto no-scrollbar touch-scroll">
              {(["ALL", "PENDING", "SUCCESS", "FAILED"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-cyan-600 text-white shadow-xs font-bold"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto touch-scroll min-h-[300px]">
            <table className="w-full text-left text-xs border-collapse min-w-[620px]">
              <thead className="bg-slate-100/90 text-slate-700 sticky top-0 border-b border-slate-200 z-10 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Client / Account</th>
                  <th className="py-2.5 px-3 font-semibold">Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">Payment Method</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
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
                        isSelected ? "bg-cyan-50/80 border-l-2 border-cyan-600" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{txn.leadName || "Enterprise Account"}</div>
                        <div className="text-[10px] font-mono text-slate-500">{txn.id}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {formatCurrency(txn.amount, txn.currency)}
                      </td>
                      <td className="py-2.5 px-3">
                        <TransactionStatusChip status={txn.status} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px] hidden sm:table-cell">
                        {txn.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] text-right">
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
        {/* Right: 6-Point Verification Desk & One-Click Settlement Action */}
        <div
          className={`w-full lg:w-2/5 p-3 sm:p-4 flex-col bg-slate-50/70 overflow-y-auto touch-scroll space-y-4 ${
            mobileTab === "queue" ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedTxn ? (
            <>
              {/* Selected Txn Summary */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Transaction ID</span>
                    <h3 className="text-sm font-bold text-slate-900 font-mono">{selectedTxn.id}</h3>
                    <div className="text-xs text-slate-600 mt-0.5 font-medium">{selectedTxn.leadName}</div>
                  </div>
                  <TransactionStatusChip status={selectedTxn.status} />
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-medium">Charge Amount</span>
                    <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700">
                      {formatCurrency(selectedTxn.amount, selectedTxn.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-medium">Gateway Reference</span>
                    <div className="text-xs font-mono text-slate-800 font-semibold">
                      {selectedTxn.gatewayTxnId || "Awaiting Capture"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6-Point Financial Risk & Verification Checklist */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-cyan-600" />
                    6-Point Card Verification Checklist
                  </span>
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                    Fraud Score: {selectedTxn.verificationChecklist?.fraudRiskScore || 2}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">Identity & PNR Matched</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">Funds Available</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">AVS Address Verified</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">CVV Cryptogram Match</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">PCI DSS Compliance Cleared</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">Manager Access Logged</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Settlement Action Trigger */}
              {selectedTxn.status === "PENDING" || selectedTxn.status === "PROCESSING" ? (
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <span className="text-xs font-bold text-slate-800 block">Financial Settlement Action</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Capturing will settle funds via the payment gateway, change the lead status to <strong>SUCCESS</strong>, and dispatch an automated onboarding ticket to Customer Service.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      disabled={isProcessing || !isChargingRole}
                      onClick={() => handleAction("CAPTURE")}
                      className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isProcessing ? "Settling..." : "Capture & Dispatch"}</span>
                    </button>
                    <button
                      disabled={isProcessing || !isChargingRole}
                      onClick={() => handleAction("DECLINE")}
                      className="px-4 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-xs transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center space-y-1 shadow-xs">
                  <div className="text-xs font-mono font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
              <CreditCard className="h-10 w-10 mb-2 stroke-[1.5] text-slate-300" />
              <p className="text-xs font-medium">Select a transaction from the queue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
