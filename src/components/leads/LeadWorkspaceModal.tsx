"use client";

import React, { useState, useEffect } from "react";
import { Lead, User, LeadStatus } from "@/types";
import { LeadStatusChip } from "@/components/common/StatusChip";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";
import { ROLE_PERMISSIONS } from "@/lib/rbac";
import {
  PREDEFINED_EMAIL_TEMPLATES,
  renderEmailTemplate,
  OFFICIAL_SENDER_EMAIL,
  OFFICIAL_SENDER_NAME,
} from "@/lib/templates";
import { RichTextEmailEditor } from "@/components/common/RichTextEmailEditor";
import {
  Plane,
  CreditCard,
  Mail,
  Send,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle,
  CheckCircle2,
  X,
  Users,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  Phone,
  Building,
  UserCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  Maximize2,
  RotateCcw,
  Edit3,
  BadgeCheck,
  Utensils,
  Armchair,
  HeartHandshake,
  MapPin,
  FileBadge,
} from "lucide-react";

interface LeadWorkspaceModalProps {
  isOpen: boolean;
  lead: Lead | null;
  currentUser: User;
  users?: User[];
  onClose: () => void;
  onTransition: (leadId: string, targetStatus: LeadStatus) => Promise<void>;
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

export function LeadWorkspaceModal({
  isOpen,
  lead,
  currentUser,
  users = [],
  onClose,
  onTransition,
  onRefresh,
  activityLogs,
}: LeadWorkspaceModalProps) {
  const [isCardUnmasked, setIsCardUnmasked] = useState(false);
  const [isGrantingCard, setIsGrantingCard] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("flight_auth_01");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

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

  // Editable Email Fields
  const [recipientEmail, setRecipientEmail] = useState<string>(lead?.email || "");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");

  // Sync email template values whenever template or lead changes
  useEffect(() => {
    if (lead) {
      const template =
        PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
        PREDEFINED_EMAIL_TEMPLATES[0];
      const preview = renderEmailTemplate(template, lead, currentUser.name);
      setCustomSubject(preview.subject);
      setCustomBody(preview.body);
      setRecipientEmail(lead.email);
    }
  }, [lead, selectedTemplateId, currentUser.name]);

  if (!isOpen || !lead) return null;

  const booking = lead.bookingDetails;
  const card = lead.cardDetails;
  const last4 = card?.cardNumber ? card.cardNumber.slice(-4) : "4242";

  // RBAC & Permission Rules
  const isSalesAgent = currentUser.role === "SALES_AGENT";
  const isManagerOrAdmin =
    currentUser.role === "SALES_MANAGER" ||
    currentUser.role === "ADMIN" ||
    currentUser.role === "SUPER_ADMIN";
  const isChargingRole =
    currentUser.role === "CHARGING_MANAGER" ||
    currentUser.role === "CHARGING_OPERATOR";

  const canAgentViewCard = card?.isAccessGrantedToAgent || false;
  const isAuthorizedToUnmask = isManagerOrAdmin || isChargingRole || canAgentViewCard;

  // STRICT RBAC: Agents CANNOT view Digital Footprint or Audit Trail
  const canViewFootprint = !isSalesAgent && !!ROLE_PERMISSIONS[currentUser.role]?.canViewDigitalFootprint;
  const canViewAuditLogs = !isSalesAgent && !!ROLE_PERMISSIONS[currentUser.role]?.canViewAuditLogs;

  // Reveal Card & Log to Digital Footprint
  const handleRevealCard = async () => {
    if (!isAuthorizedToUnmask) return;

    if (!isCardUnmasked) {
      try {
        await fetch(`/api/leads/${lead.id}/card`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "VIEW",
            actorId: currentUser.id,
          }),
        });
        await onRefresh();
      } catch (err) {
        console.error("Failed to log card view:", err);
      }
    }
    setIsCardUnmasked(!isCardUnmasked);
  };

  // Manager Grants Card Clearance to Agent
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
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to grant card access:", err);
    } finally {
      setIsGrantingCard(false);
    }
  };

  const bookingRef = lead?.bookingNumber
    ? `#${lead.bookingNumber}`
    : (lead?.bookingDetails?.pnrCode || (lead ? "TC-" + lead.id.substring(lead.id.length - 6).toUpperCase() : "TC-BOOKING"));

  const handleInsertBookingIdPrefix = () => {
    const prefix = `[Booking ID: ${bookingRef}] `;
    if (!customSubject.startsWith(prefix)) {
      const cleaned = customSubject.replace(/^\[Booking ID: [^\]]+\]\s*/i, "");
      setCustomSubject(`${prefix}${cleaned}`);
    }
  };

  // Send Predefined / Custom Email
  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      let finalSubject = customSubject.trim();
      const prefix = `[Booking ID: ${bookingRef}]`;
      if (!finalSubject.includes(prefix)) {
        finalSubject = `${prefix} ${finalSubject}`;
      }

      const res = await fetch(`/api/leads/${lead.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          actorId: currentUser.id,
          senderEmail: OFFICIAL_SENDER_EMAIL,
          recipientEmail: recipientEmail.trim() || lead.email,
          subject: finalSubject,
          body: customBody,
        }),
      });

      if (res.ok) {
        setEmailSentSuccess(true);
        setTimeout(() => setEmailSentSuccess(false), 5000);
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to send email:", err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleResetTemplateDefaults = () => {
    const template =
      PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      PREDEFINED_EMAIL_TEMPLATES[0];
    const preview = renderEmailTemplate(template, lead, currentUser.name);
    setCustomSubject(preview.subject);
    setCustomBody(preview.body);
    setRecipientEmail(lead.email);
  };

  const handleStatusChange = async (target: LeadStatus) => {
    try {
      await onTransition(lead.id, target);
      await onRefresh();
    } catch (err) {
      console.error("Status transition failed:", err);
    }
  };

  const handleAssignLead = async (targetAgentId: string) => {
    if (!lead) return;
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
      console.error("Assign error in modal:", err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-2 md:p-4 overflow-y-auto">
      <div className="relative w-full max-w-7xl h-[100dvh] sm:h-[94vh] rounded-none sm:rounded-2xl border-0 sm:border border-slate-700 bg-slate-950 shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* ========================================================================= */}
        {/* TOP BAR: Header Details, PNR, Status Dropdown, Quick Status Actions, Close */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          {/* Customer & Flight PNR Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
              <Plane className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-300 bg-amber-950/90 border border-amber-600/70 px-2 py-0.5 rounded shadow-sm">
                  Booking #{lead.bookingNumber || 1001}
                </span>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{lead.name}</h1>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                  PNR: {booking?.pnrCode || "NX-PNR"}
                </span>
                <LeadStatusChip status={lead.status} />
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-3">
                <span className="flex items-center gap-1 text-slate-300">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {lead.phone || "+1 (555) 019-2834"}
                </span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="text-slate-300 truncate max-w-[180px] sm:max-w-none flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  {lead.email}
                </span>
                {lead.company && (
                  <>
                    <span className="hidden sm:inline">&bull;</span>
                    <span className="text-slate-400 hidden sm:flex items-center gap-1">
                      <Building className="h-3 w-3 text-slate-400" />
                      {lead.company}
                    </span>
                  </>
                )}
                <span className="hidden md:inline">&bull;</span>
                <span className="text-indigo-300 font-medium hidden md:inline">
                  Assigned: {lead.assignedToName || "Pool"}
                </span>
              </div>
            </div>

            {/* Mobile Close Button in Header Corner */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition sm:hidden shrink-0"
              title="Close Workspace Window"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Actions & Status Changer */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            {/* Agent Selector Dropdown for Admin & Managers */}
            {canAssignLeads && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-indigo-700/60 rounded-lg px-2.5 py-1.5 text-xs shadow-inner">
                <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-300 uppercase font-mono flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-indigo-400" />
                  Agent:
                </span>
                <select
                  value={lead.assignedToId || "UNASSIGNED"}
                  disabled={isAssigning}
                  onChange={(e) => handleAssignLead(e.target.value)}
                  className="bg-transparent text-xs text-indigo-200 font-semibold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[170px]"
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
                  <span className="text-[10px] text-indigo-400 animate-pulse font-mono">...</span>
                )}
              </div>
            )}

            {/* Status Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase font-mono">Status:</span>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-none"
              >
                <option value="NEW" className="bg-slate-900 text-slate-100">NEW INQUIRY</option>
                <option value="FOLLOW_UP" className="bg-slate-900 text-orange-300">FOLLOW UP</option>
                <option value="AUTHENTICATION_SENT" className="bg-slate-900 text-purple-300">AUTH MAIL SENT</option>
                <option value="QUALIFIED" className="bg-slate-900 text-indigo-300">QUALIFIED</option>
                <option value="SALE" className="bg-slate-900 text-emerald-300">SALE CONFIRMED</option>
                <option value="CANCELLED" className="bg-slate-900 text-red-300">CANCELLED</option>
              </select>
            </div>

            {/* Quick Button: Mark as SALE / Dispatch to Charging */}
            {lead.status !== "SALE" && lead.status !== "CHARGING" && lead.status !== "SUCCESS" && (
              <button
                onClick={() => handleStatusChange("SALE")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Mark SALE</span>
              </button>
            )}

            {/* Close Full Window Button (Desktop) */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition hidden sm:block"
              title="Close Workspace Window"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: 2-Column High-Density Enterprise Layout                        */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANE (7 cols): Contact Details, Passenger Manifest, Email Hub      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-7 p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
            {/* SECTION 1: CUSTOMER CONTACT DETAILS (SEPARATED) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-cyan-400" />
                  Primary Customer & Contact Information
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 text-xs">
                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Full Name / Account</span>
                  <span className="font-semibold text-white mt-0.5 block truncate">{lead.name}</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Email Address</span>
                  <span className="font-semibold text-indigo-300 mt-0.5 block truncate">{lead.email}</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Phone Number</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">{lead.phone || "+1 (555) 019-2834"}</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Company / Account</span>
                  <span className="font-semibold text-slate-300 mt-0.5 block truncate">{lead.company || "Individual Client"}</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Assigned Sales Agent</span>
                  <span className="font-semibold text-emerald-300 mt-0.5 block">{lead.assignedToName || "Unassigned Pool"}</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Ingested Date Stamp</span>
                  <span className="font-mono text-slate-300 mt-0.5 block text-[11px]">{formatDate(lead.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: PASSENGER MANIFEST & TRAVEL DOCUMENTS (SEPARATED IN DETAIL) */}
            {booking && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-400" />
                    Complete Passenger Manifest ({booking.passengers.length} Pax)
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded">
                    E-Ticket Ready
                  </span>
                </div>

                <div className="space-y-3">
                  {booking.passengers.map((pax, idx) => (
                    <div key={pax.id} className="p-3 sm:p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs space-y-2.5">
                      {/* Passenger Header Banner */}
                      <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800/70 gap-1.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-950 text-indigo-300 font-mono text-[10px] border border-indigo-800">
                            {idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm text-slate-100">{pax.fullName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700">
                            {pax.type}
                          </span>
                          {pax.gender && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 hidden sm:inline">
                              {pax.gender}
                            </span>
                          )}
                        </div>
                        {pax.eTicketNumber && (
                          <div className="text-right font-mono text-[10px] sm:text-[11px] text-cyan-300 flex items-center gap-1">
                            <FileBadge className="h-3.5 w-3.5 text-cyan-400" />
                            <span>{pax.eTicketNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Passenger Detailed Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Passport #</span>
                          <span className="text-slate-100 font-bold font-mono truncate block">{pax.passportNumber || "On File"}</span>
                        </div>

                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Passport Expiry</span>
                          <span className="text-emerald-300 font-semibold font-mono truncate block">{pax.passportExpiry || "2030-12-31"}</span>
                        </div>

                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Nationality</span>
                          <span className="text-slate-200 font-medium truncate block">{pax.nationality || "Confirmed"}</span>
                        </div>

                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">DOB</span>
                          <span className="text-slate-300 font-mono truncate block">{pax.dob || "N/A"}</span>
                        </div>
                      </div>

                      {/* Seat, Meal, Special Assistance Preferences */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                        <div className="flex items-center gap-1.5 p-2 rounded bg-slate-900/50 border border-slate-800/60 text-slate-300">
                          <Armchair className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-[9px] text-slate-500 block uppercase font-mono">Assigned Seat</span>
                            <span className="font-bold text-indigo-300 truncate block">{pax.seatPreference || "Auto-Assign"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 p-2 rounded bg-slate-900/50 border border-slate-800/60 text-slate-300">
                          <Utensils className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-[9px] text-slate-500 block uppercase font-mono">Meal Preference</span>
                            <span className="font-semibold text-amber-200 truncate block">{pax.mealPreference || "Standard Gourmet"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 p-2 rounded bg-slate-900/50 border border-slate-800/60 text-slate-300">
                          <HeartHandshake className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-[9px] text-slate-500 block uppercase font-mono">Special Assistance</span>
                            <span className="font-medium text-emerald-300 truncate block">{pax.specialAssistance || "None"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: FLIGHT ITINERARY & ROUTING */}
            {booking && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-indigo-400" />
                    Flight Itinerary & Routing
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {booking.tripType}
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {formatCurrency(lead.dealValue, lead.currency)} Total Fare
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Routing</span>
                    <div className="text-sm font-bold text-white font-mono flex items-center gap-2 mt-0.5">
                      <span>{booking.origin}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{booking.destination}</span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Airline & Flight #</span>
                    <div className="text-xs font-mono font-bold text-indigo-300 mt-0.5">
                      {booking.airline} ({booking.flightNumber}) &bull; <span className="text-cyan-300">{booking.cabinClass}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 sm:p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Departure Date</span>
                    <span className="font-mono text-slate-200 font-semibold">{booking.departureDate}</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Return Date</span>
                    <span className="font-mono text-slate-200 font-semibold">{booking.returnDate || "N/A (One Way)"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: FULLY EDITABLE TRAVEL EMAIL COMPOSER WITH RICH TEXT & IMAGE PASTE */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-purple-400" />
                  Travel Email Editor & Dispatcher
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetTemplateDefaults}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/70 border border-indigo-800 px-2 py-0.5 rounded transition"
                    title="Reset subject & body to template defaults"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Reset Defaults</span>
                  </button>
                  <span className="text-[10px] font-mono text-purple-300">
                    {lead.authEmailSent ? "✓ Sent" : "Ready"}
                  </span>
                </div>
              </div>

              {/* Mandatory Official Sender Info Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400">From Official Address:</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-900/80 font-mono font-bold text-indigo-200 border border-indigo-700/60 text-[11px]">
                      {OFFICIAL_SENDER_EMAIL}
                    </span>
                    <span className="text-[10px] text-indigo-300/80">({OFFICIAL_SENDER_NAME})</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SPF / DKIM Secured
                </div>
              </div>

              {/* Template Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {PREDEFINED_EMAIL_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`p-2 rounded-lg text-left text-xs border transition ${
                      selectedTemplateId === t.id
                        ? "bg-purple-950/70 text-purple-300 border-purple-500 font-bold shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <div className="truncate font-semibold">{t.title}</div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">{t.type}</div>
                  </button>
                ))}
              </div>

              {/* Editable Fields: Recipient Email, Subject, and Rich Text Body */}
              <div className="p-3 sm:p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                {/* 1. Editable Recipient Email */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-indigo-400" />
                      To (Recipient Customer Email):
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Editable</span>
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                    placeholder="Enter customer recipient email..."
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* 2. Editable Email Subject with Booking ID Enforcement */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                      <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                      Subject Line (Must include Booking ID):
                    </label>
                    <button
                      type="button"
                      onClick={handleInsertBookingIdPrefix}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/70 border border-cyan-800 px-1.5 py-0.5 rounded transition"
                      title="Ensure Booking ID tag is inserted in subject"
                    >
                      + Ensure [Booking ID: {bookingRef}]
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    required
                    placeholder="Enter email subject..."
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-indigo-200 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* 3. Rich Text Email Body with Image Paste Support */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Message Body (Rich Text Tools & Image Paste Enabled):</span>
                    <span className="text-[10px] font-mono text-indigo-300">Ctrl+V to paste screenshots</span>
                  </label>
                  <RichTextEmailEditor
                    value={customBody}
                    onChange={setCustomBody}
                    minHeight="180px"
                    maxHeight="320px"
                  />
                </div>
              </div>

              {/* Send Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                {emailSentSuccess ? (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> Email Dispatched to {recipientEmail}!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 truncate">
                    Dispatches to <strong className="text-slate-200">{recipientEmail || lead.email}</strong>.
                  </span>
                )}

                <button
                  disabled={isSendingEmail}
                  onClick={handleSendEmail}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-95 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSendingEmail ? "Dispatching..." : "Send Travel Email"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT PANE (5 cols): Card Vault, Digital Footprint, Activity Trail      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-5 p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto bg-slate-900/30">
            {/* SECTION 5: PCI CARD SECURITY VAULT */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-cyan-400" />
                  PCI Card Vault (Partially Masked)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                  {card?.cardType || "VISA"}
                </span>
              </div>

              {/* Masked Card Visual Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/50 border border-slate-800 text-xs space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>CARDHOLDER</span>
                  <span>{card?.cardType}</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-white tracking-wider truncate">
                  {card?.cardholderName || lead.name.toUpperCase()}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">CARD NUMBER</span>
                    <div className="text-sm sm:text-base font-mono font-bold tracking-widest text-indigo-300">
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

              {/* Unmask / Reveal Button */}
              {isAuthorizedToUnmask ? (
                <div className="space-y-1.5">
                  <button
                    onClick={handleRevealCard}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition active:scale-95"
                  >
                    {isCardUnmasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{isCardUnmasked ? "Hide Unmasked Card" : "Reveal Unmasked Card (Logged)"}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center font-mono">
                    ⚠️ Viewing card details is logged into the digital footprint with actor ({currentUser.name}) and timestamp.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <Lock className="h-4 w-4" />
                    <span>Card Partially Hidden for Sales Agent</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Card numbers and CVV are masked. Send authentication email to the customer, confirm on call, then request <strong>Sales Manager</strong> clearance.
                  </p>
                </div>
              )}

              {/* Manager Grant Authority Panel */}
              {isManagerOrAdmin && !card?.isAccessGrantedToAgent && (
                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-200 flex items-center gap-1.5">
                      <Unlock className="h-4 w-4 text-indigo-400" />
                      Manager Card Clearance
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300">Manager Role</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Grant card access to assigned agent (<strong>{lead.assignedToName || "Sales Agent"}</strong>).
                  </p>
                  <button
                    disabled={isGrantingCard}
                    onClick={handleGrantCardClearance}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{isGrantingCard ? "Authorizing..." : "Grant Card Access to Agent"}</span>
                  </button>
                </div>
              )}

              {card?.isAccessGrantedToAgent && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-center text-xs font-mono text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Manager Clearance Granted by {card.grantedByManagerName || "Sales Director"}</span>
                </div>
              )}
            </div>

            {/* SECTION 6: DIGITAL FOOTPRINT (STRICTLY HIDDEN FOR SALES AGENTS) */}
            {canViewFootprint && lead.footprint && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-purple-400" />
                    Digital Footprint & Telemetry (Manager/Admin Only)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{lead.footprint.ipAddress}</span>
                </div>

                <div className="space-y-2 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-800">
                  {lead.footprint.clickstream.map((evt, idx) => {
                    const isCardEvent = evt.event === "CARD_DETAILS_VIEWED";
                    return (
                      <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                        <div
                          className={`absolute left-1 top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                            isCardEvent ? "bg-amber-400 animate-pulse" : "bg-indigo-500"
                          }`}
                        />
                        <div
                          className={`flex-1 p-2 rounded border ${
                            isCardEvent
                              ? "bg-amber-950/40 border-amber-500/40"
                              : "bg-slate-950 border-slate-800/80"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                isCardEvent ? "text-amber-300" : "text-indigo-300"
                              }`}
                            >
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

            {/* SECTION 7: AUDIT TRAIL (STRICTLY HIDDEN FOR SALES AGENTS) */}
            {canViewAuditLogs && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    Lead Audit Trail ({activityLogs.length}) (Manager/Admin Only)
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 font-mono">No activity logged yet</div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-300 font-mono text-[11px]">{log.action}</span>
                          <span className="text-[10px] font-mono text-slate-400">{formatRelativeTime(log.createdAt)}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Actor: <strong className="text-slate-200">{log.actorName}</strong> ({log.actorRole})
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
