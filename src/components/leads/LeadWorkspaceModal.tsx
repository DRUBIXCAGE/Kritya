"use client";

import React, { useState, useEffect } from "react";
import { Lead, User, LeadStatus, FlightSegment, Passenger } from "@/types";
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
  Plus,
  Trash2,
  Save,
  Edit,
  RefreshCw,
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
  const [mobileTab, setMobileTab] = useState<"booking" | "security">("booking");

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

  // Full Workspace Editing State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSavingDetails, setIsSavingDetails] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Customer Contact Fields
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editCompany, setEditCompany] = useState<string>("");
  const [editDealValue, setEditDealValue] = useState<number>(0);
  const [editCurrency, setEditCurrency] = useState<string>("USD");
  const [editNotes, setEditNotes] = useState<string>("");

  // Custom Pricing & MCO Fields (MCO = Sale Price - Ticket Price = actual amount earned by agent)
  const [editSalePrice, setEditSalePrice] = useState<number>(0);
  const [editTicketPrice, setEditTicketPrice] = useState<number>(0);
  const [editMco, setEditMco] = useState<number>(0);

  // Handlers for automatic calculation
  const handleSalePriceChange = (val: number) => {
    const sp = isNaN(val) ? 0 : Math.max(0, val);
    setEditSalePrice(sp);
    setEditDealValue(sp);
    // Formula: MCO = Sale Price - Ticket Price (Amount earned by agent)
    if (sp > 0) {
      setEditMco(sp - editTicketPrice);
    } else {
      setEditMco(0);
    }
  };

  const handleTicketPriceChange = (val: number) => {
    const tp = isNaN(val) ? 0 : Math.max(0, val);
    setEditTicketPrice(tp);
    if (editSalePrice > 0) {
      setEditMco(editSalePrice - tp);
    }
  };

  const handleMcoChange = (val: number) => {
    const m = isNaN(val) ? 0 : val;
    setEditMco(m);
    const newSp = Math.max(0, editTicketPrice + m);
    setEditSalePrice(newSp);
    setEditDealValue(newSp);
  };

  // Flight Itinerary & Multi-Flight Fields
  const [editTripType, setEditTripType] = useState<"ROUND_TRIP" | "ONE_WAY" | "MULTI_CITY">("ROUND_TRIP");
  const [editPnrCode, setEditPnrCode] = useState<string>("");
  const [editFlights, setEditFlights] = useState<FlightSegment[]>([]);

  // Passenger Manifest Fields
  const [editPassengers, setEditPassengers] = useState<Passenger[]>([]);

  // Sync lead values to edit state whenever lead changes
  useEffect(() => {
    if (lead) {
      setEditName(lead.name || "");
      setEditEmail(lead.email || "");
      setEditPhone(lead.phone || "");
      setEditCompany(lead.company || "");

      const isConfirmed = ["SALE", "CHARGING", "SUCCESS"].includes(lead.status);
      const tp = lead.ticketPrice ?? 0;
      // No default values: only ticket price was ingested from site.
      // Agent enters sale price unless it's already set or is a confirmed sale.
      const sp = (typeof lead.salePrice === "number" && lead.salePrice > 0)
        ? lead.salePrice
        : (isConfirmed ? (lead.dealValue || tp) : 0);
      const m = sp > 0 ? (lead.mco !== undefined ? lead.mco : (sp - tp)) : 0;

      setEditSalePrice(sp);
      setEditTicketPrice(tp);
      setEditMco(m);
      setEditDealValue(sp);
      setEditCurrency(lead.currency || "USD");
      setEditNotes(lead.notes || "");

      const b = lead.bookingDetails;
      setEditTripType(b?.tripType || "ROUND_TRIP");
      setEditPnrCode(b?.pnrCode || "");
      setEditPassengers(b?.passengers ? JSON.parse(JSON.stringify(b.passengers)) : []);

      if (b?.flights && b.flights.length > 0) {
        setEditFlights(JSON.parse(JSON.stringify(b.flights)));
      } else {
        setEditFlights([
          {
            id: "flt_1",
            airline: b?.airline || "American Airlines",
            flightNumber: b?.flightNumber || "AA 100",
            origin: b?.origin || "JFK",
            destination: b?.destination || "LHR",
            departureDate: b?.departureDate || new Date().toISOString().split("T")[0],
            departureTime: "08:30 AM",
            arrivalDate: b?.departureDate || new Date().toISOString().split("T")[0],
            arrivalTime: "08:45 PM",
            cabinClass: b?.cabinClass || "ECONOMY",
          },
        ]);
      }
    }
  }, [lead]);

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
          // Call server to expire and log to fingerprinting
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

  const isCardExpired = (!card?.isAccessGrantedToAgent && !!card?.grantedAt) || (card?.isAccessGrantedToAgent && remainingCardSeconds === 0);
  const isCardActive = !!card?.isAccessGrantedToAgent && (remainingCardSeconds === null || remainingCardSeconds > 0);

  const canAgentViewCard = isCardActive;
  const isAuthorizedToUnmask = isManagerOrAdmin || isChargingRole || canAgentViewCard;

  // STRICT RBAC: Agents CANNOT view Digital Footprint or Audit Trail
  const canViewFootprint = !isSalesAgent && !!ROLE_PERMISSIONS[currentUser.role]?.canViewDigitalFootprint;
  const canViewAuditLogs = !isSalesAgent && !!ROLE_PERMISSIONS[currentUser.role]?.canViewAuditLogs;

  // Reveal Card & Log to Digital Footprint / Fingerprinting
  const handleRevealCard = async () => {
    if (!isAuthorizedToUnmask) return;

    if (!isCardUnmasked) {
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
      // Concealing card -> log to fingerprinting
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

  // Manager Grants Card Clearance to Agent (3-Minute Window, Logged in Fingerprinting)
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

  // Save All Workspace Details
  const handleSaveDetails = async () => {
    if (!lead) return;
    setIsSavingDetails(true);
    setSaveSuccessMessage(null);
    try {
      const firstFlt = editFlights[0];
      const lastFlt = editFlights[editFlights.length - 1];

      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentUser.id,
          name: editName,
          email: editEmail,
          phone: editPhone,
          company: editCompany,
          dealValue: Number(editSalePrice),
          salePrice: Number(editSalePrice),
          ticketPrice: Number(editTicketPrice),
          mco: Number(editMco),
          currency: editCurrency,
          notes: editNotes,
          bookingDetails: {
            tripType: editTripType,
            pnrCode: editPnrCode,
            origin: firstFlt?.origin || lead.bookingDetails?.origin || "JFK",
            destination: lastFlt?.destination || lead.bookingDetails?.destination || "LHR",
            airline: firstFlt?.airline || lead.bookingDetails?.airline || "American Airlines",
            flightNumber: firstFlt?.flightNumber || lead.bookingDetails?.flightNumber || "AA 100",
            departureDate: firstFlt?.departureDate || lead.bookingDetails?.departureDate || new Date().toISOString().split("T")[0],
            cabinClass: firstFlt?.cabinClass || lead.bookingDetails?.cabinClass || "ECONOMY",
            flights: editFlights,
            passengers: editPassengers,
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert("Failed to save changes: " + data.error);
      } else {
        setSaveSuccessMessage("✓ All booking details & flights saved successfully!");
        setTimeout(() => setSaveSuccessMessage(null), 4000);
        await onRefresh();
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to update workspace details:", err);
      alert("Error updating details.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Multi-Flight Operations
  const handleAddFlight = () => {
    const last = editFlights[editFlights.length - 1];
    setEditFlights((prev) => [
      ...prev,
      {
        id: `flt_${Date.now()}_${prev.length + 1}`,
        airline: last?.airline || "American Airlines",
        flightNumber: "",
        origin: last?.destination || "JFK",
        destination: "",
        departureDate: last?.departureDate || new Date().toISOString().split("T")[0],
        departureTime: "10:00 AM",
        arrivalDate: last?.departureDate || new Date().toISOString().split("T")[0],
        arrivalTime: "02:30 PM",
        cabinClass: last?.cabinClass || "ECONOMY",
      },
    ]);
  };

  const handleRemoveFlight = (idx: number) => {
    if (editFlights.length <= 1) return;
    setEditFlights((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateFlight = (idx: number, field: keyof FlightSegment, val: string) => {
    setEditFlights((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Passenger Manifest Operations
  const handleAddPassenger = () => {
    setEditPassengers((prev) => [
      ...prev,
      {
        id: `pax_${Date.now()}_${prev.length + 1}`,
        fullName: "",
        type: "ADULT",
        gender: "MALE",
        passportNumber: "",
        passportExpiry: "",
        nationality: "USA",
        dob: "",
        seatPreference: "Auto-Assign",
        mealPreference: "Standard Gourmet",
        specialAssistance: "None",
      },
    ]);
  };

  const handleRemovePassenger = (idx: number) => {
    if (editPassengers.length <= 1) return;
    setEditPassengers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdatePassenger = (idx: number, field: keyof Passenger, val: string) => {
    setEditPassengers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:p-2 md:p-4 sm:items-center sm:justify-center bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-7xl h-full sm:h-[94vh] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 bg-white shadow-2xl flex flex-col text-slate-900 overflow-hidden">
        {/* ========================================================================= */}
        {/* TOP BAR: Header Details, PNR, Status Dropdown, Quick Status Actions, Close */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          {/* Customer & Flight PNR Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
              <Plane className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded shadow-xs">
                  Booking #{lead.bookingNumber || 1001}
                </span>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">{lead.name}</h1>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PNR: {editPnrCode || booking?.pnrCode || "NX-PNR"}
                </span>
                <LeadStatusChip status={lead.status} />
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-3">
                <span className="flex items-center gap-1 text-slate-700">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {editPhone || lead.phone || "+1 (555) 019-2834"}
                </span>
                <span className="hidden sm:inline text-slate-300">&bull;</span>
                <span className="text-slate-700 truncate max-w-[180px] sm:max-w-none flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  {editEmail || lead.email}
                </span>
                {lead.company && (
                  <>
                    <span className="hidden sm:inline text-slate-300">&bull;</span>
                    <span className="text-slate-600 hidden sm:flex items-center gap-1">
                      <Building className="h-3 w-3 text-slate-400" />
                      {editCompany || lead.company}
                    </span>
                  </>
                )}
                <span className="hidden md:inline text-slate-300">&bull;</span>
                <span className="text-indigo-700 font-medium hidden md:inline">
                  Assigned: {lead.assignedToName || "Pool"}
                </span>
              </div>
            </div>

            {/* Mobile Close Button in Header Corner */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition sm:hidden shrink-0"
              title="Close Workspace Window"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Actions & Status Changer */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            {/* Agent Selector Dropdown for Admin & Managers */}
            {canAssignLeads && (
              <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-700 uppercase font-mono flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-indigo-600" />
                  Agent:
                </span>
                <select
                  value={lead.assignedToId || "UNASSIGNED"}
                  disabled={isAssigning}
                  onChange={(e) => handleAssignLead(e.target.value)}
                  className="bg-transparent text-xs text-indigo-900 font-semibold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[170px]"
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
                {isAssigning && (
                  <span className="text-[10px] text-indigo-600 animate-pulse font-mono">...</span>
                )}
              </div>
            )}

            {/* Status Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase font-mono">Status:</span>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="bg-transparent text-xs text-slate-900 font-bold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-none"
              >
                <option value="NEW" className="bg-white text-slate-800">NEW INQUIRY</option>
                <option value="FOLLOW_UP" className="bg-white text-orange-700">FOLLOW UP</option>
                <option value="AUTHENTICATION_SENT" className="bg-white text-purple-700">AUTH MAIL SENT</option>
                <option value="QUALIFIED" className="bg-white text-indigo-700">QUALIFIED</option>
                <option value="SALE" className="bg-white text-emerald-700">SALE CONFIRMED</option>
                <option value="CANCELLED" className="bg-white text-red-700">CANCELLED</option>
              </select>
            </div>

            {/* Edit / Save Workspace Toggle Button */}
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition shadow-xs active:scale-95"
                title="Edit customer details, passenger manifest, and add multiple flights"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Workspace</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingDetails ? "Saving..." : "Save All Changes"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingDetails}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            )}

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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition hidden sm:block"
              title="Close Workspace Window"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Save Success Notification Banner */}
        {saveSuccessMessage && (
          <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between px-4 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-700 text-[11px] hover:underline font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mobile Tab Switcher for small screens (< lg) */}
        <div className="lg:hidden flex border-b border-slate-200 bg-slate-100 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("booking")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              mobileTab === "booking"
                ? "bg-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            <span>Booking & Manifest</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("security")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              mobileTab === "security"
                ? "bg-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Card Vault & Audit</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: 2-Column High-Density Enterprise Layout                        */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANE (7 cols): Contact Details, Passenger Manifest, Email Hub      */}
          {/* ----------------------------------------------------------------------- */}
          <div
            className={`lg:col-span-7 p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto touch-scroll bg-white ${
              mobileTab === "security" ? "hidden lg:block" : "block"
            }`}
          >
            {/* SECTION 1: CUSTOMER CONTACT DETAILS (IN-PLACE EDITABLE) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-cyan-600" />
                  Primary Customer & Contact Information
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                    Verified Account
                  </span>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      EDITING
                    </span>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Passenger / Account Name"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="customer@email.com"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Phone Number</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Company / Org</label>
                      <input
                        type="text"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        placeholder="Individual or Corporate Account"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                {/* Financial & MCO Commission Calculator Block */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-emerald-50/60 border border-indigo-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Fare Pricing & Agent MCO Commission Calculator
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full shadow-xs">
                      MCO = Sale Price − Ticket Price
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="text-[10px] font-mono text-slate-700 uppercase block font-semibold mb-0.5">
                        Sale Price (Agent Quote)
                      </label>
                      <input
                        type="number"
                        value={editSalePrice || ""}
                        onChange={(e) => handleSalePriceChange(Number(e.target.value))}
                        placeholder="Enter Sale Price"
                        className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-700 uppercase block font-semibold mb-0.5">
                        Ticket Price (Ingested from Site)
                      </label>
                      <input
                        type="number"
                        value={editTicketPrice || ""}
                        onChange={(e) => handleTicketPriceChange(Number(e.target.value))}
                        placeholder="Ingested Ticket Price"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-emerald-800 uppercase block font-semibold mb-0.5 flex items-center justify-between">
                        <span>MCO (Agent Earned)</span>
                        <span className="text-[9px] text-emerald-600 font-mono">Auto Calc</span>
                      </label>
                      <input
                        type="number"
                        value={editMco}
                        onChange={(e) => handleMcoChange(Number(e.target.value))}
                        placeholder="Agent MCO"
                        className="w-full bg-emerald-50/80 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-extrabold text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-700 uppercase block font-semibold mb-0.5">Currency</label>
                      <select
                        value={editCurrency}
                        onChange={(e) => setEditCurrency(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-indigo-900 bg-white/70 border border-indigo-100 rounded-lg px-2.5 py-1.5">
                    <span className="flex items-center gap-1 font-mono">
                      <span>💡 <strong>MCO:</strong> {formatCurrency(editSalePrice, editCurrency)} (Sale) − {formatCurrency(editTicketPrice, editCurrency)} (Ticket) =</span>
                      <strong className={`font-extrabold text-xs ${editMco >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {editMco >= 0 ? `+${formatCurrency(editMco, editCurrency)}` : `-${formatCurrency(Math.abs(editMco), editCurrency)}`}
                      </strong>
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      Actual amount earned by agent
                    </span>
                  </div>
                </div>
              </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 text-xs">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-mono uppercase">Full Name / Account</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block truncate">{editName || lead.name}</span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-mono uppercase">Email Address</span>
                      <span className="font-semibold text-indigo-700 mt-0.5 block truncate">{editEmail || lead.email}</span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-mono uppercase">Phone Number</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{editPhone || lead.phone || "+1 (555) 019-2834"}</span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-mono uppercase">Company / Account</span>
                      <span className="font-semibold text-slate-700 mt-0.5 block truncate">{editCompany || lead.company || "Individual Client"}</span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-mono uppercase">Assigned Sales Agent</span>
                      <span className="font-semibold text-indigo-700 mt-0.5 block">{lead.assignedToName || "Unassigned Pool"}</span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-mono uppercase">Created Date</span>
                      <span className="font-mono text-slate-700 mt-0.5 block text-[11px]">{formatDate(lead.createdAt)}</span>
                    </div>
                  </div>

                  {/* Prominent Financial Breakdown & MCO Earnings Display */}
                  {(() => {
                    const isConfirmed = ["SALE", "CHARGING", "SUCCESS"].includes(lead.status);
                    const hasSalePrice = typeof editSalePrice === "number" && editSalePrice > 0;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-mono uppercase block">
                            {isConfirmed ? "Confirmed Sale Price" : "Sale Price (Agent Quote)"}
                          </span>
                          <span className="text-base font-mono font-extrabold text-slate-900 mt-0.5 block">
                            {hasSalePrice
                              ? formatCurrency(editSalePrice, editCurrency || lead.currency)
                              : isConfirmed
                              ? formatCurrency(lead.salePrice || lead.dealValue || 0, editCurrency || lead.currency)
                              : (
                                <span className="text-amber-700 text-xs font-semibold">Awaiting Agent Quote</span>
                              )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {isConfirmed ? "Settled total charged" : hasSalePrice ? "Quoted by sales agent" : "Enter in edit mode to calculate MCO"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-mono uppercase block">Ticket Price (Ingested from Site)</span>
                          <span className="text-base font-mono font-bold text-slate-700 mt-0.5 block">
                            {formatCurrency(editTicketPrice || lead.ticketPrice || 0, editCurrency || lead.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Net airline fare cost</span>
                        </div>

                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-emerald-800 font-mono font-bold uppercase block">
                              Agent MCO (Earned)
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                              Agent Profit
                            </span>
                          </div>
                          <span className="text-base font-mono font-extrabold text-emerald-800 mt-0.5 block">
                            {hasSalePrice || isConfirmed
                              ? `+${formatCurrency(editMco || lead.mco || 0, editCurrency || lead.currency)}`
                              : <span className="text-slate-400 text-xs">-- (Awaiting Sale Price)</span>}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                            {hasSalePrice || isConfirmed
                              ? "Actual amount earned by agent"
                              : "Auto-calculated once sale price is entered"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* SECTION 2: PASSENGER MANIFEST & TRAVEL DOCUMENTS (IN-PLACE EDITABLE) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Complete Passenger Manifest ({editPassengers.length} Pax)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    E-Ticket Ready
                  </span>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit Pax</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {editPassengers.map((pax, idx) => (
                  <div key={pax.id || idx} className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                    {/* Passenger Header Banner */}
                    <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-200 gap-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-mono text-[10px] border border-indigo-200">
                          {idx + 1}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={pax.fullName}
                            onChange={(e) => handleUpdatePassenger(idx, "fullName", e.target.value)}
                            placeholder="Passenger Full Name"
                            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm text-slate-900">{pax.fullName || "Unnamed Passenger"}</span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-indigo-700 border border-slate-200">
                          {pax.type}
                        </span>
                        {pax.gender && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hidden sm:inline">
                            {pax.gender}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing && editPassengers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePassenger(idx)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                            title="Remove this passenger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {pax.eTicketNumber && !isEditing && (
                          <div className="text-right font-mono text-[10px] sm:text-[11px] text-cyan-800 flex items-center gap-1">
                            <FileBadge className="h-3.5 w-3.5 text-cyan-600" />
                            <span>{pax.eTicketNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Passenger Detail Inputs vs View Cards */}
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">Pax Type</label>
                          <select
                            value={pax.type}
                            onChange={(e) => handleUpdatePassenger(idx, "type", e.target.value as any)}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="ADULT">Adult</option>
                            <option value="CHILD">Child</option>
                            <option value="INFANT">Infant</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">Passport #</label>
                          <input
                            type="text"
                            value={pax.passportNumber}
                            onChange={(e) => handleUpdatePassenger(idx, "passportNumber", e.target.value)}
                            placeholder="Passport Number"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">Passport Expiry</label>
                          <input
                            type="date"
                            value={pax.passportExpiry || ""}
                            onChange={(e) => handleUpdatePassenger(idx, "passportExpiry", e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">Nationality</label>
                          <input
                            type="text"
                            value={pax.nationality || ""}
                            onChange={(e) => handleUpdatePassenger(idx, "nationality", e.target.value)}
                            placeholder="Nationality"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">Date of Birth</label>
                          <input
                            type="date"
                            value={pax.dob || ""}
                            onChange={(e) => handleUpdatePassenger(idx, "dob", e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">Assigned Seat</label>
                          <input
                            type="text"
                            value={pax.seatPreference || ""}
                            onChange={(e) => handleUpdatePassenger(idx, "seatPreference", e.target.value)}
                            placeholder="e.g. 14B / Window"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">Meal Choice</label>
                          <input
                            type="text"
                            value={pax.mealPreference || ""}
                            onChange={(e) => handleUpdatePassenger(idx, "mealPreference", e.target.value)}
                            placeholder="e.g. Vegan / Kosher"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 uppercase font-mono block">E-Ticket Number</label>
                          <input
                            type="text"
                            value={pax.eTicketNumber || ""}
                            onChange={(e) => handleUpdatePassenger(idx, "eTicketNumber", e.target.value)}
                            placeholder="e.g. ETKT-001-9428"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-cyan-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                          <div className="p-2 rounded bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-500 block uppercase font-mono">Passport #</span>
                            <span className="text-slate-800 font-bold font-mono truncate block">{pax.passportNumber || "On File"}</span>
                          </div>

                          <div className="p-2 rounded bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-500 block uppercase font-mono">Passport Expiry</span>
                            <span className="text-emerald-700 font-semibold font-mono truncate block">{pax.passportExpiry || "2030-12-31"}</span>
                          </div>

                          <div className="p-2 rounded bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-500 block uppercase font-mono">Nationality</span>
                            <span className="text-slate-800 font-medium truncate block">{pax.nationality || "Confirmed"}</span>
                          </div>

                          <div className="p-2 rounded bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-500 block uppercase font-mono">DOB</span>
                            <span className="text-slate-700 font-mono truncate block">{pax.dob || "N/A"}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                          <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-slate-200 text-slate-700">
                            <Armchair className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <div className="truncate">
                              <span className="text-[9px] text-slate-500 block uppercase font-mono">Assigned Seat</span>
                              <span className="font-bold text-indigo-700 truncate block">{pax.seatPreference || "Auto-Assign"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-slate-200 text-slate-700">
                            <Utensils className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <div className="truncate">
                              <span className="text-[9px] text-slate-500 block uppercase font-mono">Meal Preference</span>
                              <span className="font-semibold text-amber-800 truncate block">{pax.mealPreference || "Standard Gourmet"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-slate-200 text-slate-700">
                            <HeartHandshake className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <span className="text-[9px] text-slate-500 block uppercase font-mono">Special Assistance</span>
                              <span className="font-medium text-emerald-700 truncate block">{pax.specialAssistance || "None"}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Passenger Action */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    handleAddPassenger();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition active:scale-95 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Another Passenger</span>
                </button>
              </div>
            </div>

            {/* SECTION 3: FLIGHT ITINERARY & MULTIPLE FLIGHT SEGMENTS */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plane className="h-4 w-4 text-indigo-600" />
                  Flight Itinerary & Route Segments ({editFlights.length} Flights)
                </span>
                <div className="flex items-center gap-2">
                  {/* Trip Type badge / select */}
                  {isEditing ? (
                    <select
                      value={editTripType}
                      onChange={(e) => setEditTripType(e.target.value as any)}
                      className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-slate-50 text-indigo-700 border border-indigo-300 cursor-pointer"
                    >
                      <option value="ROUND_TRIP">ROUND TRIP</option>
                      <option value="ONE_WAY">ONE WAY</option>
                      <option value="MULTI_CITY">MULTI CITY</option>
                    </select>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                      {editTripType}
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(editSalePrice || lead.salePrice || lead.dealValue, editCurrency || lead.currency)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shadow-xs">
                      MCO: +{formatCurrency(editMco || lead.mco || 0, editCurrency || lead.currency)}
                    </span>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit Flights</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PNR Code bar */}
              <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <FileBadge className="h-4 w-4 text-indigo-600" />
                  <span className="font-semibold text-slate-700 font-mono text-[11px]">PNR / Reservation Code:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editPnrCode}
                      onChange={(e) => setEditPnrCode(e.target.value.toUpperCase())}
                      placeholder="e.g. NX-PNR99"
                      className="bg-white border border-indigo-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-indigo-900 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="font-mono font-bold text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded">
                      {editPnrCode || booking?.pnrCode || "NX-PNR"}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-indigo-600">GDS Live Synced</span>
              </div>

              {/* List of Multiple Flight Segments */}
              <div className="space-y-3">
                {editFlights.map((flt, fIdx) => (
                  <div key={flt.id || fIdx} className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    {/* Flight Leg Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold">
                          Flight Leg #{fIdx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 font-mono text-[11px]">
                          {flt.airline} ({flt.flightNumber || "TBD"})
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium">
                          {flt.cabinClass}
                        </span>
                      </div>

                      {isEditing && editFlights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFlight(fIdx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                          title="Remove this flight leg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Flight Leg Fields: Edit Inputs vs View Summary */}
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Origin (From)</label>
                          <input
                            type="text"
                            value={flt.origin}
                            onChange={(e) => handleUpdateFlight(fIdx, "origin", e.target.value)}
                            placeholder="e.g. JFK (New York)"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Destination (To)</label>
                          <input
                            type="text"
                            value={flt.destination}
                            onChange={(e) => handleUpdateFlight(fIdx, "destination", e.target.value)}
                            placeholder="e.g. LHR (London)"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Airline</label>
                          <input
                            type="text"
                            value={flt.airline}
                            onChange={(e) => handleUpdateFlight(fIdx, "airline", e.target.value)}
                            placeholder="Airline Name"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Flight Number</label>
                          <input
                            type="text"
                            value={flt.flightNumber}
                            onChange={(e) => handleUpdateFlight(fIdx, "flightNumber", e.target.value)}
                            placeholder="e.g. AA 100"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Departure Date</label>
                          <input
                            type="date"
                            value={flt.departureDate}
                            onChange={(e) => handleUpdateFlight(fIdx, "departureDate", e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Departure Time</label>
                          <input
                            type="text"
                            value={flt.departureTime || ""}
                            onChange={(e) => handleUpdateFlight(fIdx, "departureTime", e.target.value)}
                            placeholder="08:30 AM"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Arrival Time</label>
                          <input
                            type="text"
                            value={flt.arrivalTime || ""}
                            onChange={(e) => handleUpdateFlight(fIdx, "arrivalTime", e.target.value)}
                            placeholder="08:45 PM"
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Cabin Class</label>
                          <select
                            value={flt.cabinClass}
                            onChange={(e) => handleUpdateFlight(fIdx, "cabinClass", e.target.value as any)}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="ECONOMY">Economy</option>
                            <option value="PREMIUM_ECONOMY">Premium Economy</option>
                            <option value="BUSINESS">Business Class</option>
                            <option value="FIRST">First Class</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{flt.origin}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{flt.destination}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono flex items-center gap-2 flex-wrap">
                          <span>📅 Departure: {flt.departureDate} {flt.departureTime ? `@ ${flt.departureTime}` : ""}</span>
                          {flt.arrivalTime && <span>🛬 Arrival: {flt.arrivalTime}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Flight Leg Button & Save Trigger */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    handleAddFlight();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition active:scale-95 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Another Flight Leg / Connection</span>
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save All Changes</span>
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 4: FULLY EDITABLE TRAVEL EMAIL COMPOSER WITH RICH TEXT & IMAGE PASTE */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-purple-600" />
                  Travel Email Editor & Dispatcher
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetTemplateDefaults}
                    className="flex items-center gap-1 text-[11px] text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded transition font-medium"
                    title="Reset subject & body to template defaults"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Reset Defaults</span>
                  </button>
                  <span className="text-[10px] font-mono text-purple-700 font-medium">
                    {lead.authEmailSent ? "✓ Sent" : "Ready"}
                  </span>
                </div>
              </div>

              {/* Mandatory Official Sender Info Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-600">From Official Address:</span>
                    <span className="px-2 py-0.5 rounded bg-white font-mono font-bold text-indigo-700 border border-indigo-200 text-[11px]">
                      {OFFICIAL_SENDER_EMAIL}
                    </span>
                    <span className="text-[10px] text-indigo-900/80">({OFFICIAL_SENDER_NAME})</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
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
                        ? "bg-purple-50 text-purple-900 border-purple-400 font-bold shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="truncate font-semibold">{t.title}</div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">{t.type}</div>
                  </button>
                ))}
              </div>

              {/* Editable Fields: Recipient Email, Subject, and Rich Text Body */}
              <div className="p-3 sm:p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                {/* 1. Editable Recipient Email */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-indigo-600" />
                      To (Recipient Customer Email):
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">Editable</span>
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                    placeholder="Enter customer recipient email..."
                    className="w-full rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* 2. Editable Email Subject with Booking ID Enforcement */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                      Subject Line (Must include Booking ID):
                    </label>
                    <button
                      type="button"
                      onClick={handleInsertBookingIdPrefix}
                      className="text-[10px] font-mono text-cyan-800 hover:text-cyan-900 bg-cyan-50 border border-cyan-300 px-1.5 py-0.5 rounded transition font-medium"
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
                    className="w-full rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs text-indigo-900 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* 3. Rich Text Email Body with Image Paste Support */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Message Body (Rich Text Tools & Image Paste Enabled):</span>
                    <span className="text-[10px] font-mono text-indigo-600">Ctrl+V to paste screenshots</span>
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
                  <span className="text-xs font-mono text-emerald-700 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> Email Dispatched to {recipientEmail}!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 truncate">
                    Dispatches to <strong className="text-slate-800">{recipientEmail || lead.email}</strong>.
                  </span>
                )}

                <button
                  disabled={isSendingEmail}
                  onClick={handleSendEmail}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-95 shrink-0"
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
          <div
            className={`lg:col-span-5 p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto touch-scroll bg-slate-50/70 ${
              mobileTab === "booking" ? "hidden lg:block" : "block"
            }`}
          >
            {/* SECTION 5: PCI CARD SECURITY VAULT */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-cyan-600" />
                  PCI Card Vault (Partially Masked)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-cyan-800 border border-slate-200 font-bold">
                  {card?.cardType || "VISA"}
                </span>
              </div>

              {/* 3-Minute Active Visibility Countdown Widget */}
              {card?.isAccessGrantedToAgent && remainingCardSeconds !== null && remainingCardSeconds > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-semibold text-emerald-900">
                      {isSalesAgent ? "Card Access Active (3-Min Window)" : `Clearance Active for ${lead.assignedToName || "Agent"}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-xs px-2.5 py-1 rounded bg-white text-emerald-800 border border-emerald-300 shadow-2xs">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                    <span>{Math.floor(remainingCardSeconds / 60)}:{(remainingCardSeconds % 60).toString().padStart(2, "0")}</span>
                    <span className="text-[10px] text-emerald-600 font-normal">remaining</span>
                  </div>
                </div>
              )}

              {/* 3-Minute Access Expired Banner */}
              {isCardExpired && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs flex items-center justify-between text-rose-800 shadow-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Card access expired (3-minute authorization elapsed)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                    Re-mask Enforced
                  </span>
                </div>
              )}

              {/* Masked Card Visual Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 border border-slate-700 text-xs space-y-3 text-white shadow-md">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
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
                    <div className="text-xs font-mono font-bold text-slate-200">
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition active:scale-95"
                  >
                    {isCardUnmasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{isCardUnmasked ? "Hide Unmasked Card (Logged)" : "Reveal Unmasked Card (Logged to Footprint)"}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center font-mono">
                    ⚠️ Viewing and concealing card details are permanently logged into the digital footprint with actor ({currentUser.name}) and timestamp.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <Lock className="h-4 w-4" />
                    <span>Card Partially Hidden for Sales Agent</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Card numbers and CVV are masked. Send authentication email to the customer, confirm on call, then request <strong>Sales Manager</strong> clearance for a 3-minute view window.
                  </p>
                </div>
              )}

              {/* Manager Grant Authority Panel */}
              {isManagerOrAdmin && (!card?.isAccessGrantedToAgent || remainingCardSeconds === 0) && (
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Unlock className="h-4 w-4 text-indigo-600" />
                      Manager Card Clearance
                    </span>
                    <span className="text-[10px] font-mono text-indigo-700 font-semibold">Manager Role</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Grant <strong>3-minute temporary card access</strong> to assigned agent (<strong>{lead.assignedToName || "Sales Agent"}</strong>). All views and expirations will be logged in fingerprinting.
                  </p>
                  <button
                    disabled={isGrantingCard}
                    onClick={handleGrantCardClearance}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{isGrantingCard ? "Authorizing 3-Min Access..." : (isCardExpired ? "Renew 3-Minute Clearance for Agent" : "Grant 3-Minute Card Access to Agent")}</span>
                  </button>
                </div>
              )}

              {card?.isAccessGrantedToAgent && remainingCardSeconds !== null && remainingCardSeconds > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center text-xs font-mono text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>3-Minute Manager Clearance Granted by {card.grantedByManagerName || "Sales Director"}</span>
                </div>
              )}
            </div>

            {/* SECTION 6: DIGITAL FOOTPRINT (STRICTLY HIDDEN FOR SALES AGENTS) */}
            {canViewFootprint && lead.footprint && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-purple-600" />
                    Digital Footprint & Fingerprinting Telemetry (Manager/Admin Only)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{lead.footprint.ipAddress}</span>
                </div>

                <div className="space-y-2 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200">
                  {lead.footprint.clickstream.map((evt, idx) => {
                    const isCardEvent = evt.event.startsWith("CARD_");
                    const isCardGrant = evt.event === "CARD_ACCESS_GRANTED_BY_MANAGER";
                    const isCardView = evt.event === "CARD_DETAILS_VIEWED";
                    const isCardExpiredEvt = evt.event === "CARD_ACCESS_EXPIRED";
                    const isCardConceal = evt.event === "CARD_DETAILS_CONCEALED";

                    let dotColor = "bg-indigo-500";
                    let cardBg = "bg-slate-50 border-slate-200";
                    let titleColor = "text-indigo-700";

                    if (isCardGrant) {
                      dotColor = "bg-emerald-500";
                      cardBg = "bg-emerald-50/80 border-emerald-300";
                      titleColor = "text-emerald-800";
                    } else if (isCardView) {
                      dotColor = "bg-amber-500 animate-pulse";
                      cardBg = "bg-amber-50/80 border-amber-300";
                      titleColor = "text-amber-800";
                    } else if (isCardExpiredEvt) {
                      dotColor = "bg-rose-500";
                      cardBg = "bg-rose-50/80 border-rose-300";
                      titleColor = "text-rose-800";
                    } else if (isCardConceal) {
                      dotColor = "bg-slate-500";
                      cardBg = "bg-slate-100 border-slate-300";
                      titleColor = "text-slate-800";
                    }

                    return (
                      <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                        <div
                          className={`absolute left-1 top-1 h-3 w-3 rounded-full border-2 border-white ${dotColor}`}
                        />
                        <div className={`flex-1 p-2 rounded border ${cardBg}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-mono font-bold text-[11px] ${titleColor}`}>
                              {evt.event}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">{formatRelativeTime(evt.timestamp)}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-700 mt-0.5">{evt.url}</div>
                          {evt.metadata && (
                            <div className="text-[10px] font-mono text-slate-600 mt-1 pt-1 border-t border-slate-200/80">
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
              <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    Lead Audit Trail ({activityLogs.length}) (Manager/Admin Only)
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-mono">No activity logged yet</div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-700 font-mono text-[11px]">{log.action}</span>
                          <span className="text-[10px] font-mono text-slate-500">{formatRelativeTime(log.createdAt)}</span>
                        </div>
                        <div className="text-slate-600 text-[10px] mt-0.5">
                          Actor: <strong className="text-slate-800">{log.actorName}</strong> ({log.actorRole})
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
