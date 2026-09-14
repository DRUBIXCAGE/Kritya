"use client";

import React, { useState, useEffect } from "react";
import { Lead, User, LeadStatus } from "@/types";
import { LeadStatusChip } from "@/components/common/StatusChip";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";
import { ROLE_PERMISSIONS } from "@/lib/rbac";
import { PredefinedEmailModal } from "./PredefinedEmailModal";
import {
  Globe,
  ShieldCheck,
  Clock,
  ArrowRight,
  Terminal,
  Activity,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  DollarSign,
  UserCheck,
  Flame,
  ChevronRight,
  Plane,
  CreditCard,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Unlock,
  Users,
  Calendar,
  Ticket as TicketIcon,
  PhoneCall,
  AlertTriangle,
  Building,
  Armchair,
  Utensils,
  HeartHandshake,
  FileBadge,
} from "lucide-react";

interface LeadDetailSplitPaneProps {
  lead: Lead | null;
  currentUser: User;
  users?: User[];
  onClose: () => void;
  onTransition: (targetStatus: LeadStatus) => Promise<void>;
  onRefresh: () => Promise<void>;
  activityLogs: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string;
    fromState?: string;
    toState?: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
}

export function LeadDetailSplitPane({
  lead,
  currentUser,
  users = [],
  onClose,
  onTransition,
  onRefresh,
  activityLogs,
}: LeadDetailSplitPaneProps) {
  const [activeTab, setActiveTab] = useState<"flight" | "card" | "security" | "footprint" | "timeline">("flight");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isCardUnmasked, setIsCardUnmasked] = useState(false);
  const [isGrantingCard, setIsGrantingCard] = useState(false);

  const isSalesAgent = currentUser.role === "SALES_AGENT";
  const isManagerOrAdmin =
    currentUser.role === "SALES_MANAGER" ||
    currentUser.role === "ADMIN" ||
    currentUser.role === "SUPER_ADMIN";
  const isChargingRole =
    currentUser.role === "CHARGING_MANAGER" ||
    currentUser.role === "CHARGING_OPERATOR";

  const canAssignLeads =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN" ||
    currentUser.role === "SALES_MANAGER" ||
    currentUser.role.endsWith("_MANAGER");

  const salesAgents = (users || []).filter(
    (u) =>
      (u.role === "SALES_AGENT" ||
        u.role.endsWith("_AGENT") ||
        u.role.endsWith("_OPERATOR")) &&
      u.isActive
  );

  // STRICT RBAC Rules: Agents CANNOT see digital footprint or audit logs
  const canViewFootprint = !isSalesAgent && !!ROLE_PERMISSIONS[currentUser.role]?.canViewDigitalFootprint;
  const canViewAuditLogs = !isSalesAgent && !!ROLE_PERMISSIONS[currentUser.role]?.canViewAuditLogs;

  // Auto-switch tab if current active tab is restricted for this role
  useEffect(() => {
    if (activeTab === "footprint" && !canViewFootprint) {
      setActiveTab("flight");
    }
    if (activeTab === "timeline" && !canViewAuditLogs) {
      setActiveTab("flight");
    }
  }, [activeTab, canViewFootprint, canViewAuditLogs]);

  // 3-Minute Card Visibility Countdown Timer State
  const [remainingCardSeconds, setRemainingCardSeconds] = useState<number | null>(null);

  // Sync remaining seconds when lead/card changes
  useEffect(() => {
    const card = lead?.cardDetails;
    if (!lead || !card?.isAccessGrantedToAgent) {
      setRemainingCardSeconds(null);
      setIsCardUnmasked(false);
      return;
    }

    const calculateRemaining = () => {
      if (card.accessExpiresAt) {
        return Math.max(0, Math.floor((new Date(card.accessExpiresAt).getTime() - Date.now()) / 1000));
      }
      if (card.grantedAt) {
        const expires = new Date(card.grantedAt).getTime() + 3 * 60 * 1000;
        return Math.max(0, Math.floor((expires - Date.now()) / 1000));
      }
      return 180;
    };

    const initialRemaining = calculateRemaining();
    setRemainingCardSeconds(initialRemaining);

    if (initialRemaining <= 0) {
      setIsCardUnmasked(false);
      fetch(`/api/leads/${lead.id}/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EXPIRE", actorId: currentUser.id }),
      }).catch(() => {});
    }
  }, [lead?.cardDetails?.isAccessGrantedToAgent, lead?.cardDetails?.accessExpiresAt, lead?.cardDetails?.grantedAt, lead?.id, currentUser.id]);

  // Active countdown timer ticker (1-second tick)
  useEffect(() => {
    if (!lead || remainingCardSeconds === null || remainingCardSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingCardSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setIsCardUnmasked(false);
          if (lead?.id) {
            fetch(`/api/leads/${lead.id}/card`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "EXPIRE", actorId: currentUser.id }),
            })
              .then(() => onRefresh())
              .catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingCardSeconds, lead?.id, currentUser.id, onRefresh]);

  if (!lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-950/40 border-l border-slate-800">
        <Plane className="h-12 w-12 stroke-[1.2] mb-3 text-slate-700" />
        <h3 className="text-sm font-semibold text-slate-400">No Booking Selected</h3>
        <p className="text-xs text-slate-600 mt-1 max-w-xs">
          Select any flight booking record to inspect passengers, routes, masked payment card details, and dispatch travel confirmations.
        </p>
      </div>
    );
  }

  const booking = lead.bookingDetails;
  const card = lead.cardDetails;
  const last4 = card?.cardNumber ? card.cardNumber.slice(-4) : "4242";

  const isCardExpired = (!card?.isAccessGrantedToAgent && !!card?.grantedAt) || (card?.isAccessGrantedToAgent && remainingCardSeconds === 0);
  const isCardActive = !!card?.isAccessGrantedToAgent && (remainingCardSeconds === null || remainingCardSeconds > 0);

  const canAgentViewCard = isCardActive;
  const isAuthorizedToUnmask = isManagerOrAdmin || isChargingRole || canAgentViewCard;

  const handleStateChange = async (target: LeadStatus) => {
    setIsTransitioning(true);
    try {
      await onTransition(target);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleRevealCard = async () => {
    if (!isAuthorizedToUnmask) return;

    if (!isCardUnmasked) {
      // Log card view to digital footprint
      try {
        const res = await fetch(`/api/leads/${lead.id}/card`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "VIEW",
            actorId: currentUser.id,
          }),
        });
        const data = await res.json();
        if (!data.success && data.error) {
          alert(data.error);
          setIsCardUnmasked(false);
          await onRefresh();
          return;
        }
        await onRefresh();
      } catch (err) {
        console.error("Failed to log card view:", err);
      }
      setIsCardUnmasked(true);
    } else {
      // Conceal card -> log to fingerprinting
      try {
        await fetch(`/api/leads/${lead.id}/card`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CONCEAL",
            actorId: currentUser.id,
          }),
        });
        await onRefresh();
      } catch (err) {
        console.error("Failed to log card conceal:", err);
      }
      setIsCardUnmasked(false);
    }
  };

  const handleGrantCardClearance = async () => {
    setIsGrantingCard(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GRANT",
          actorId: currentUser.id,
        }),
      });
      if (res.ok) {
        setRemainingCardSeconds(180);
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to grant card access:", err);
    } finally {
      setIsGrantingCard(false);
    }
  };

  const handleAssignLead = async (targetAgentId: string) => {
    setIsAssigning(true);
    try {
      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          targetAgentId: targetAgentId === "UNASSIGNED" ? null : targetAgentId,
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Assignment failed: " + data.error);
      } else {
        await onRefresh();
      }
    } catch (err) {
      console.error("Assign error:", err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/90 border-l border-slate-800/80 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2 py-0.5 rounded shadow-xs">
                Booking #{lead.bookingNumber || 1001}
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">{lead.name}</h2>
              <LeadStatusChip status={lead.status} />
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-indigo-300 font-mono">
                PNR: {booking?.pnrCode || "NX-PNR"}
              </span>
              <span>&bull;</span>
              <span className="text-slate-300">{lead.phone || lead.email}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded hover:bg-slate-800 transition"
          >
            ✕ Close
          </button>
        </div>

        {/* Flight Route Banner */}
        {booking && (
          <div className="mt-3 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-indigo-500/20 text-indigo-400">
                <Plane className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>{booking.origin}</span>
                  <ArrowRight className="h-3 w-3 text-indigo-400" />
                  <span>{booking.destination}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {booking.airline} &bull; {booking.flightNumber} &bull; <strong className="text-indigo-300">{booking.cabinClass}</strong>
                </div>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-xs font-bold text-emerald-400 font-mono">
                {formatCurrency(lead.dealValue, lead.currency)}
              </div>
              <div className="text-[10px] text-slate-400">{booking.passengers.length} Passenger(s)</div>
            </div>
          </div>
        )}

        {/* State Machine & Email Action Strip */}
        <div className="mt-3 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-200 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
              Sales Controls ({currentUser.role})
            </span>
            <span className="text-[10px] font-mono text-slate-400">Lead Stage Actions</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {/* Predefined Email Action */}
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-500 text-white shadow transition active:scale-95"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Compose Travel Email</span>
            </button>

            {lead.status !== "FOLLOW_UP" && lead.status !== "SALE" && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateChange("FOLLOW_UP")}
                className="px-2.5 py-1 text-xs font-medium rounded bg-orange-600/80 hover:bg-orange-500 disabled:opacity-40 text-white shadow transition"
              >
                Follow-Up
              </button>
            )}

            {lead.status !== "QUALIFIED" && lead.status !== "SALE" && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateChange("QUALIFIED")}
                className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow transition"
              >
                Qualify
              </button>
            )}

            {lead.status !== "SALE" && lead.status !== "CHARGING" && lead.status !== "SUCCESS" && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateChange("SALE")}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 text-white shadow-md shadow-emerald-600/25 transition active:scale-95"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Confirm SALE &rarr; Dispatch</span>
              </button>
            )}

            {lead.status !== "CANCELLED" && lead.status !== "SUCCESS" && (
              <button
                disabled={isTransitioning}
                onClick={() => handleStateChange("CANCELLED")}
                className="px-2 py-1 text-xs font-medium rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Strictly hiding Footprint and Audit Trail for Agents) */}
        <div className="flex border-b border-slate-800 mt-3 gap-3 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab("flight")}
            className={`pb-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "flight"
                ? "border-indigo-500 text-indigo-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Flight & Pax ({booking?.passengers?.length || 1})
          </button>
          <button
            onClick={() => setActiveTab("card")}
            className={`pb-2 border-b-2 transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === "card"
                ? "border-indigo-500 text-indigo-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="h-3 w-3" />
            <span>Card Vault</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "security"
                ? "border-indigo-500 text-indigo-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            SPF / DKIM Trust
          </button>

          {/* Digital Footprint is ONLY visible to Managers & Admins */}
          {canViewFootprint && (
            <button
              onClick={() => setActiveTab("footprint")}
              className={`pb-2 border-b-2 transition whitespace-nowrap flex items-center gap-1 ${
                activeTab === "footprint"
                  ? "border-indigo-500 text-indigo-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="h-3 w-3 text-cyan-400" />
              <span>Digital Footprint</span>
            </button>
          )}

          {/* Audit Trail is ONLY visible to Managers & Admins */}
          {canViewAuditLogs && (
            <button
              onClick={() => setActiveTab("timeline")}
              className={`pb-2 border-b-2 transition whitespace-nowrap ${
                activeTab === "timeline"
                  ? "border-indigo-500 text-indigo-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Audit Trail ({activityLogs.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab Content Panels */}
      <div className="p-4 space-y-4 flex-1">
        {/* TAB 1: Flight Itinerary, Contact Information & Passenger Details */}
        {activeTab === "flight" && (
          <div className="space-y-4">
            {/* 1. Customer Contact Details Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-cyan-400" />
                  Primary Customer & Contact Details
                </span>
                {!canAssignLeads && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Assigned: {lead.assignedToName || "Pool"}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-mono uppercase">Full Name</span>
                  <span className="font-semibold text-white">{lead.name}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-mono uppercase">Phone</span>
                  <span className="font-semibold text-slate-200">{lead.phone || "+1 (555) 019-2834"}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-mono uppercase">Email</span>
                  <span className="font-semibold text-indigo-300 truncate block">{lead.email}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-mono uppercase">Company</span>
                  <span className="font-semibold text-slate-300 truncate block">{lead.company || "Direct Client"}</span>
                </div>
              </div>

              {/* Agent Assignment Selector for Admin & Managers */}
              {canAssignLeads && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-indigo-900/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
                    <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Assigned Sales Agent:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={lead.assignedToId || "UNASSIGNED"}
                      disabled={isAssigning}
                      onChange={(e) => handleAssignLead(e.target.value)}
                      className={`text-xs rounded-md px-2.5 py-1 font-medium transition cursor-pointer border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
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
                    {isAssigning && (
                      <span className="text-[10px] text-indigo-400 animate-pulse font-mono">Updating...</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Flight Itinerary Schedule */}
            {booking && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-indigo-400" />
                    Flight Schedule & Routing
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {booking.tripType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Departure Date</span>
                    <span className="font-mono text-slate-200 font-semibold">{booking.departureDate}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Return Date</span>
                    <span className="font-mono text-slate-200 font-semibold">{booking.returnDate || "N/A (One Way)"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Passenger Manifest Roster */}
            {booking && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-400" />
                    Passenger Manifest ({booking.passengers.length} Pax)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Verified Manifest</span>
                </div>

                <div className="space-y-2">
                  {booking.passengers.map((pax, idx) => (
                    <div key={pax.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-950 text-indigo-300 font-mono text-[10px] border border-indigo-800">
                            {idx + 1}
                          </span>
                          <span>{pax.fullName}</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                          {pax.type} {pax.gender ? `(${pax.gender})` : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Passport #</span>
                          <span className="text-slate-200 font-bold">{pax.passportNumber || "On File"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Passport Expiry</span>
                          <span className="text-emerald-400">{pax.passportExpiry || "Valid"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Nationality</span>
                          <span className="text-slate-300">{pax.nationality || "Confirmed"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Assigned Seat</span>
                          <span className="text-indigo-300 font-bold">{pax.seatPreference || "Auto"}</span>
                        </div>
                      </div>

                      {/* Meal & Special Assistance */}
                      <div className="pt-1 text-[11px] text-slate-400 flex flex-wrap gap-2">
                        {pax.mealPreference && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
                            Meal: {pax.mealPreference}
                          </span>
                        )}
                        {pax.specialAssistance && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                            Assist: {pax.specialAssistance}
                          </span>
                        )}
                        {pax.eTicketNumber && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800 font-mono">
                            {pax.eTicketNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PCI Card Vault */}
        {activeTab === "card" && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                PCI Card Security Vault (Partially Masked)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                {card?.cardType || "VISA"}
              </span>
            </div>

            {/* 3-Minute Active Visibility Countdown Widget */}
            {card?.isAccessGrantedToAgent && remainingCardSeconds !== null && remainingCardSeconds > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-emerald-200">
                    {isSalesAgent ? "Card Access Active (3-Min Window)" : `Clearance Active for ${lead.assignedToName || "Agent"}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-900 text-emerald-300 border border-emerald-500/40">
                  <Clock className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                  <span>{Math.floor(remainingCardSeconds / 60)}:{(remainingCardSeconds % 60).toString().padStart(2, "0")}</span>
                  <span className="text-[10px] text-emerald-400 font-normal">remaining</span>
                </div>
              </div>
            )}

            {/* 3-Minute Access Expired Notice */}
            {isCardExpired && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs flex items-center justify-between text-rose-300 shadow-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Card access expired (3-minute authorization elapsed)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-500/40 font-bold">
                  Re-mask Enforced
                </span>
              </div>
            )}

            {/* Masked Card Visual Card */}
            <div className="p-4 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 text-xs space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>CARDHOLDER</span>
                <span>{card?.cardType}</span>
              </div>
              <div className="text-sm font-bold text-white tracking-wider">
                {card?.cardholderName || lead.name.toUpperCase()}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">CARD NUMBER</span>
                  <div className="text-base font-mono font-bold tracking-widest text-indigo-300">
                    {isCardUnmasked && isAuthorizedToUnmask ? (
                      card?.cardNumber || `4532 8901 2948 ${last4}`
                    ) : (
                      `•••• •••• •••• ${last4}`
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block">EXP / CVV</span>
                  <div className="text-xs font-mono font-bold text-slate-300">
                    {isCardUnmasked && isAuthorizedToUnmask ? (
                      `${card?.expiryMonth || "08"}/${card?.expiryYear || "2028"} (CVV: ${card?.cvv || "891"})`
                    ) : (
                      `••/•• (CVV: •••)`
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Unmask Button or Security Notice */}
            {isAuthorizedToUnmask ? (
              <div className="space-y-1.5">
                <button
                  onClick={handleRevealCard}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition active:scale-95"
                >
                  {isCardUnmasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{isCardUnmasked ? "Hide Unmasked Card (Logged)" : "Reveal Unmasked Card (Logged to Footprint)"}</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center font-mono">
                  ⚠️ Viewing and concealing card details are permanently logged into the digital footprint with actor name ({currentUser.name}) and timestamp.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Lock className="h-4 w-4" />
                  <span>Card Masked for Sales Agent</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Send authentication email to client, verify on call, then request <strong>Sales Manager</strong> clearance for a 3-minute temporary view window.
                </p>
              </div>
            )}

            {/* Manager Grant Authority Panel */}
            {isManagerOrAdmin && (!card?.isAccessGrantedToAgent || remainingCardSeconds === 0) && (
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-200 flex items-center gap-1.5">
                    <Unlock className="h-4 w-4 text-indigo-400" />
                    Manager Card Clearance
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300">Manager Role</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Grant <strong>3-minute temporary card access</strong> to assigned agent (<strong>{lead.assignedToName || "Agent"}</strong>). All views and expirations will be logged in fingerprinting.
                </p>
                <button
                  disabled={isGrantingCard}
                  onClick={handleGrantCardClearance}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{isGrantingCard ? "Authorizing 3-Min Access..." : (isCardExpired ? "Renew 3-Minute Clearance for Agent" : "Grant 3-Minute Card Access to Agent")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Security & Verification */}
        {activeTab === "security" && lead.emailVerification && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <span className="font-bold text-slate-200 block">Email Cryptographic Trust Verification</span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">SPF</span>
                <span className="font-bold font-mono text-emerald-400">{lead.emailVerification.spfResult}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">DKIM</span>
                <span className="font-bold font-mono text-emerald-400">{lead.emailVerification.dkimResult}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">DMARC</span>
                <span className="font-bold font-mono text-emerald-400">{lead.emailVerification.dmarcResult}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Digital Footprint (Manager / Admin ONLY) */}
        {activeTab === "footprint" && canViewFootprint && lead.footprint && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-purple-400" />
                Ingress Telemetry & Fingerprinting (Manager/Admin Only)
              </span>
              <span className="text-[10px] font-mono text-slate-400">{lead.footprint.ipAddress}</span>
            </div>

            <div className="space-y-2 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-800">
              {lead.footprint.clickstream.map((evt, idx) => {
                const isCardEvent = evt.event.startsWith("CARD_");
                const isCardGrant = evt.event === "CARD_ACCESS_GRANTED_BY_MANAGER";
                const isCardView = evt.event === "CARD_DETAILS_VIEWED";
                const isCardExpiredEvt = evt.event === "CARD_ACCESS_EXPIRED";
                const isCardConceal = evt.event === "CARD_DETAILS_CONCEALED";

                let dotColor = "bg-indigo-500";
                let cardBg = "bg-slate-950 border-slate-800/80";
                let titleColor = "text-indigo-300";

                if (isCardGrant) {
                  dotColor = "bg-emerald-400";
                  cardBg = "bg-emerald-950/40 border-emerald-500/40";
                  titleColor = "text-emerald-300";
                } else if (isCardView) {
                  dotColor = "bg-amber-400 animate-pulse";
                  cardBg = "bg-amber-950/40 border-amber-500/40";
                  titleColor = "text-amber-300";
                } else if (isCardExpiredEvt) {
                  dotColor = "bg-rose-400";
                  cardBg = "bg-rose-950/40 border-rose-500/40";
                  titleColor = "text-rose-300";
                } else if (isCardConceal) {
                  dotColor = "bg-slate-400";
                  cardBg = "bg-slate-900 border-slate-700";
                  titleColor = "text-slate-300";
                }

                return (
                  <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                    <div
                      className={`absolute left-1 top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${dotColor}`}
                    />
                    <div className={`flex-1 p-2 rounded border ${cardBg}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-bold text-[11px] ${titleColor}`}>
                          {evt.event}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{formatRelativeTime(evt.timestamp)}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 mt-0.5">{evt.url}</div>
                      {evt.metadata && (
                        <div className="text-[10px] font-mono text-slate-400 mt-1 pt-1 border-t border-slate-800/60">
                          {JSON.stringify(evt.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: Audit Trail (Manager / Admin ONLY) */}
        {activeTab === "timeline" && canViewAuditLogs && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 block">Lead Audit Trail ({activityLogs.length})</span>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {activityLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-300 font-mono text-[11px]">{log.action}</span>
                    <span className="text-[10px] font-mono text-slate-400">{formatRelativeTime(log.createdAt)}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    Actor: <strong className="text-slate-200">{log.actorName}</strong> ({log.actorRole})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Predefined Email Modal Component */}
      <PredefinedEmailModal
        isOpen={isEmailModalOpen}
        lead={lead}
        currentUser={currentUser}
        onClose={() => setIsEmailModalOpen(false)}
        onSuccess={() => onRefresh()}
      />
    </div>
  );
}
