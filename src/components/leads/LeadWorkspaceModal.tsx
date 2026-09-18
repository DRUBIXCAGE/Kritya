"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  Bot,
  History,
} from "lucide-react";

export type WorkspaceWindow = "overview" | "email" | "booking_details" | "card_vault" | "audit";

interface LeadWorkspaceModalProps {
  isOpen: boolean;
  lead: Lead | null;
  currentUser: User;
  users?: User[];
  initialWindow?: WorkspaceWindow;
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
  initialWindow = "overview",
  onClose,
  onTransition,
  onRefresh,
  activityLogs,
}: LeadWorkspaceModalProps) {
  // Active Window / View in the Workspace
  const [activeWindow, setActiveWindow] = useState<WorkspaceWindow>(initialWindow || "overview");

  // Helper to log any workspace sub-window or user interaction into digital fingerprints
  const logWorkspaceEvent = (event: string, remark: string, metadata?: Record<string, unknown>) => {
    if (!lead?.id || !currentUser?.id) return;
    fetch(`/api/leads/${lead.id}/fingerprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        isAutoLogged: true,
        remark,
        metadata,
      }),
    }).catch((err) => console.error("Auto-fingerprint error:", err));
  };

  // Sync activeWindow when initialWindow or lead changes
  useEffect(() => {
    if (isOpen) {
      setActiveWindow(initialWindow || "overview");
    }
  }, [isOpen, initialWindow, lead?.id]);

  // Query Remark State
  const [quickRemark, setQuickRemark] = useState<string>("");
  const [isLoggingRemark, setIsLoggingRemark] = useState<boolean>(false);
  const [remarkSuccessMessage, setRemarkSuccessMessage] = useState<string | null>(null);

  // Auto-log opening of the booking workspace into digital fingerprints if user hasn't entered a remark yet
  useEffect(() => {
    if (isOpen && lead?.id && currentUser?.id) {
      fetch(`/api/leads/${lead.id}/fingerprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "BOOKING_WORKSPACE_OPENED",
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          isAutoLogged: true,
          remark: `Booking workspace opened by ${currentUser.name} (${currentUser.role})`,
        }),
      }).catch((err) => console.error("Auto-fingerprint error:", err));
    }
  }, [isOpen, lead?.id, currentUser?.id, currentUser?.name, currentUser?.role]);

  // Window Switcher with Automatic Fingerprint Tracking
  const handleSwitchWindow = (target: WorkspaceWindow) => {
    if (target === activeWindow) return;
    setActiveWindow(target);
    const windowTitles: Record<WorkspaceWindow, string> = {
      overview: "Overview Hub",
      email: "Send Travel Mail",
      booking_details: "Add / Edit Booking & Flights",
      card_vault: "PCI Card Vault",
      audit: "Audit & Telemetry",
    };
    logWorkspaceEvent(
      `WORKSPACE_WINDOW_${target.toUpperCase()}`,
      `Opened ${windowTitles[target] || target} window by ${currentUser.name} (${currentUser.role})`
    );
  };

  // Close Workspace Handler with Action Logging
  const handleCloseWorkspace = () => {
    if (lead?.id && currentUser?.id) {
      fetch(`/api/leads/${lead.id}/fingerprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "BOOKING_WORKSPACE_CLOSED",
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          isAutoLogged: true,
          remark: `Closed booking workspace by ${currentUser.name} (${currentUser.role})`,
        }),
      }).catch(() => {});
    }
    onClose();
  };

  // Cancel / Discard Edit Handler with Action Logging
  const handleCancelEdit = () => {
    logWorkspaceEvent(
      "EDIT_CANCELLED_WITHOUT_SAVING",
      `Exited edit details mode without saving changes by ${currentUser.name} (${currentUser.role})`
    );
    setActiveWindow("overview");
  };

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

  // Full Workspace Editing State
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

  // Track loaded lead ID to prevent background poll / event renders from overwriting user typing
  const loadedLeadIdRef = useRef<string | null>(null);

  // Sync lead values to edit state ONLY when opening or switching to a new lead
  useEffect(() => {
    if (lead && lead.id !== loadedLeadIdRef.current) {
      loadedLeadIdRef.current = lead.id;

      setEditName(lead.name || "");
      setEditEmail(lead.email || "");
      setEditPhone(lead.phone || "");
      setEditCompany(lead.company || "");

      const isConfirmed = ["SALE", "CHARGING", "SUCCESS"].includes(lead.status);
      const tp = lead.ticketPrice ?? 0;
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
  }, [lead?.id]);

  // Track email sync state so user email edits are NOT wiped out on background refreshes
  const emailSyncedLeadIdRef = useRef<string | null>(null);
  const emailSyncedTemplateIdRef = useRef<string | null>(null);

  // Sync email template values whenever template changes or a new lead is loaded
  useEffect(() => {
    if (lead) {
      const isNewLead = lead.id !== emailSyncedLeadIdRef.current;
      const isNewTemplate = selectedTemplateId !== emailSyncedTemplateIdRef.current;

      if (isNewLead || isNewTemplate) {
        emailSyncedLeadIdRef.current = lead.id;
        emailSyncedTemplateIdRef.current = selectedTemplateId;

        const template =
          PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
          PREDEFINED_EMAIL_TEMPLATES[0];
        const preview = renderEmailTemplate(template, lead, currentUser.name);
        setCustomSubject(preview.subject);
        setCustomBody(preview.body);
        setRecipientEmail(lead.email || "");
      }
    }
  }, [lead?.id, selectedTemplateId, currentUser.name]);

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

  // Manual Query Remark Logger to Digital Fingerprints
  const handleLogRemark = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickRemark.trim() || !lead) return;
    setIsLoggingRemark(true);
    setRemarkSuccessMessage(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/fingerprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "QUERY_REMARK_RECORDED",
          remark: quickRemark.trim(),
          actorId: currentUser.id,
          isAutoLogged: false,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Failed to log remark: " + (data.error || "Unknown error"));
      } else {
        setQuickRemark("");
        setRemarkSuccessMessage("✓ Remark added to digital fingerprint timeline!");
        setTimeout(() => setRemarkSuccessMessage(null), 3500);
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to log query remark:", err);
      alert("Error logging remark");
    } finally {
      setIsLoggingRemark(false);
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
        if (data.lead) {
          loadedLeadIdRef.current = data.lead.id;
        }
        setSaveSuccessMessage("✓ All booking details & flights saved successfully!");
        setTimeout(() => setSaveSuccessMessage(null), 4000);
        await onRefresh();
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
    const newLeg: FlightSegment = {
      id: `flt_${Date.now()}_${editFlights.length + 1}`,
      airline: last?.airline || "American Airlines",
      flightNumber: "",
      origin: last?.destination || "JFK",
      destination: "",
      departureDate: last?.departureDate || new Date().toISOString().split("T")[0],
      departureTime: "10:00 AM",
      arrivalDate: last?.departureDate || new Date().toISOString().split("T")[0],
      arrivalTime: "02:30 PM",
      cabinClass: last?.cabinClass || "ECONOMY",
    };
    setEditFlights((prev) => [...prev, newLeg]);
    logWorkspaceEvent(
      "FLIGHT_LEG_ADDED",
      `Added new flight leg #${editFlights.length + 1} (${newLeg.origin} -> Pending) to draft itinerary by ${currentUser.name} (${currentUser.role})`
    );
  };

  const handleRemoveFlight = (idx: number) => {
    if (editFlights.length <= 1) return;
    const removed = editFlights[idx];
    setEditFlights((prev) => prev.filter((_, i) => i !== idx));
    logWorkspaceEvent(
      "FLIGHT_LEG_REMOVED",
      `Removed flight leg #${idx + 1} (${removed?.origin || "?"} -> ${removed?.destination || "?"}) by ${currentUser.name} (${currentUser.role})`
    );
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
    const newPax: Passenger = {
      id: `pax_${Date.now()}_${editPassengers.length + 1}`,
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
    };
    setEditPassengers((prev) => [...prev, newPax]);
    logWorkspaceEvent(
      "PASSENGER_ADDED",
      `Added new passenger slot #${editPassengers.length + 1} to manifest by ${currentUser.name} (${currentUser.role})`
    );
  };

  const handleRemovePassenger = (idx: number) => {
    if (editPassengers.length <= 1) return;
    const removed = editPassengers[idx];
    setEditPassengers((prev) => prev.filter((_, i) => i !== idx));
    logWorkspaceEvent(
      "PASSENGER_REMOVED",
      `Removed passenger #${idx + 1} (${removed?.fullName || "Unnamed"}) from manifest by ${currentUser.name} (${currentUser.role})`
    );
  };

  const handleUpdatePassenger = (idx: number, field: keyof Passenger, val: string) => {
    setEditPassengers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const isConfirmed = ["SALE", "CHARGING", "SUCCESS"].includes(lead.status);
  const primaryOrigin = editFlights[0]?.origin || booking?.origin || "JFK";
  const primaryDest = editFlights[editFlights.length - 1]?.destination || booking?.destination || "LHR";
  const primaryAirline = editFlights[0]?.airline || booking?.airline || "American Airlines";
  const primaryDate = editFlights[0]?.departureDate || booking?.departureDate || "Pending";

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:p-2 md:p-4 sm:items-center sm:justify-center bg-slate-900/60 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-full sm:h-[94vh] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 bg-slate-100/90 shadow-2xl flex flex-col text-slate-900 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* TOP BAR: Header Details, PNR, Status Dropdown, Quick Actions, Close        */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-xs">
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
                {(editCompany || lead.company) && (
                  <>
                    <span className="hidden sm:inline text-slate-300">&bull;</span>
                    <span className="text-slate-600 hidden sm:flex items-center gap-1">
                      <Building className="h-3 w-3 text-slate-400" />
                      {editCompany || lead.company}
                    </span>
                  </>
                )}
                <span className="hidden md:inline text-slate-300">&bull;</span>
                <span className={`font-medium hidden md:inline ${lead.assignedToName ? "text-indigo-700" : "text-amber-800 font-bold"}`}>
                  Assigned: {lead.assignedToName || "⚠️ Unassigned (travelocase.com)"}
                </span>
              </div>
            </div>

            {/* Mobile Close Button in Header Corner */}
            <button
              onClick={handleCloseWorkspace}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition sm:hidden shrink-0"
              title="Close Workspace Window"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Actions & Status Changer */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            {canAssignLeads && (
              <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border ${
                lead.assignedToId
                  ? "bg-indigo-50/70 border-indigo-200"
                  : "bg-amber-100/90 border-amber-400 shadow-xs"
              }`}>
                <span className={`text-[10px] sm:text-[11px] font-bold uppercase font-mono flex items-center gap-1 ${
                  lead.assignedToId ? "text-indigo-700" : "text-amber-950"
                }`}>
                  <UserCheck className="h-3 w-3" />
                  Agent:
                </span>
                <select
                  value={lead.assignedToId || "UNASSIGNED"}
                  disabled={isAssigning}
                  onChange={(e) => handleAssignLead(e.target.value)}
                  className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[180px] ${
                    lead.assignedToId ? "text-indigo-900" : "text-amber-950"
                  }`}
                >
                  <option value="UNASSIGNED" className="bg-amber-50 text-amber-900 font-bold">
                    ⚠️ Unassigned (travelocase.com)
                  </option>
                  {salesAgents.map((ag) => (
                    <option key={ag.id} value={ag.id} className="bg-white text-slate-800">
                      {ag.name} (@{ag.username})
                    </option>
                  ))}
                </select>
                {isAssigning && (
                  <span className="text-[10px] text-indigo-600 animate-pulse font-mono font-bold">...</span>
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

            {/* Quick Button: Mark as SALE / Dispatch to Charging */}
            {lead.status !== "SALE" && lead.status !== "CHARGING" && lead.status !== "SUCCESS" && (
              <button
                onClick={() => handleStatusChange("SALE")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Mark SALE</span>
              </button>
            )}

            {/* Close Full Window Button (Desktop) */}
            <button
              onClick={handleCloseWorkspace}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition hidden sm:block cursor-pointer"
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
              className="text-emerald-700 text-[11px] hover:underline font-mono cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-WINDOW NAVIGATION BAR: Breadcrumb & Window Switcher                    */}
        {/* ========================================================================= */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
            <button
              onClick={() => handleSwitchWindow("overview")}
              className={`flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-md transition cursor-pointer ${
                activeWindow === "overview"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Overview</span>
            </button>

            <span className="text-slate-300">/</span>

            {activeWindow !== "overview" && (
              <button
                onClick={() => handleSwitchWindow("overview")}
                className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-semibold px-1.5 py-0.5 rounded transition text-[11px] cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back to Overview</span>
              </button>
            )}

            {activeWindow === "email" && (
              <span className="flex items-center gap-1.5 font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-[11px]">
                <Mail className="h-3 w-3" />
                <span>Send Travel Mail</span>
              </span>
            )}

            {activeWindow === "booking_details" && (
              <span className="flex items-center gap-1.5 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px]">
                <Plane className="h-3 w-3" />
                <span>Edit Booking & Flights</span>
              </span>
            )}

            {activeWindow === "card_vault" && (
              <span className="flex items-center gap-1.5 font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md text-[11px]">
                <CreditCard className="h-3 w-3" />
                <span>PCI Card Vault</span>
              </span>
            )}

            {activeWindow === "audit" && (
              <span className="flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                <Clock className="h-3 w-3" />
                <span>Audit & Telemetry</span>
              </span>
            )}
          </div>

          {/* Window Quick Switcher Buttons in Sub-Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => handleSwitchWindow("email")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeWindow === "email"
                  ? "bg-purple-600 text-white shadow-xs font-bold"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
              }`}
            >
              <Mail className="h-3 w-3" />
              <span>Send Mail</span>
            </button>

            <button
              onClick={() => handleSwitchWindow("booking_details")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeWindow === "booking_details"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              }`}
            >
              <Edit className="h-3 w-3" />
              <span>Edit Details</span>
            </button>

            <button
              onClick={() => handleSwitchWindow("card_vault")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeWindow === "card_vault"
                  ? "bg-cyan-700 text-white shadow-xs font-bold"
                  : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200"
              }`}
            >
              <CreditCard className="h-3 w-3" />
              <span>Card Vault</span>
            </button>

            {canViewFootprint && (
              <button
                onClick={() => handleSwitchWindow("audit")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeWindow === "audit"
                    ? "bg-slate-800 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                <Globe className="h-3 w-3" />
                <span>Audit</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WINDOW 1: SIMPLIFIED WORKSPACE OVERVIEW HUB (DEFAULT)                      */}
        {/* ========================================================================= */}
        {activeWindow === "overview" && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 touch-scroll">
            {/* HERO ACTION LAUNCH BAR: Interactive buttons to open focused windows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Window Button 1: Send Mail */}
              <button
                type="button"
                onClick={() => handleSwitchWindow("email")}
                className="group p-4 rounded-xl bg-gradient-to-br from-purple-50 via-white to-purple-50/40 border-2 border-purple-200 hover:border-purple-500 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 group-hover:scale-110 transition-transform">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                    {lead.authEmailSent ? "✓ Mail Sent" : "Ready"}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors flex items-center gap-1">
                    <span>Send Travel Mail</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Compose & dispatch card auth, e-ticket itinerary, or follow-up email.
                  </p>
                </div>
              </button>

              {/* Window Button 2: Add / Edit Booking Details */}
              <button
                type="button"
                onClick={() => handleSwitchWindow("booking_details")}
                className="group p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 border-2 border-indigo-200 hover:border-indigo-500 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                    <Plane className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                    {editFlights.length} Legs &bull; {editPassengers.length} Pax
                  </span>
                </div>
                <div className="mt-3">
                  <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors flex items-center gap-1">
                    <span>Add / Edit Booking Details</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Edit flights, passenger manifest, contact info & pricing/MCO.
                  </p>
                </div>
              </button>

              {/* Window Button 3: PCI Card Vault */}
              <button
                type="button"
                onClick={() => handleSwitchWindow("card_vault")}
                className="group p-4 rounded-xl bg-gradient-to-br from-cyan-50 via-white to-cyan-50/40 border-2 border-cyan-200 hover:border-cyan-500 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="h-10 w-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center shadow-md shadow-cyan-700/20 group-hover:scale-110 transition-transform">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isCardActive 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}>
                    {isCardActive ? "3-Min Active" : `Masked (•••• ${last4})`}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="font-bold text-slate-900 text-sm group-hover:text-cyan-800 transition-colors flex items-center gap-1">
                    <span>PCI Card Vault</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Secure card view, manager clearance & 3-minute access timer.
                  </p>
                </div>
              </button>

              {/* Window Button 4: Audit Trail & Telemetry (Manager/Admin) */}
              {canViewFootprint ? (
                <button
                  type="button"
                  onClick={() => handleSwitchWindow("audit")}
                  className="group p-4 rounded-xl bg-gradient-to-br from-slate-100 via-white to-slate-100/60 border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="h-10 w-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-800/20 group-hover:scale-110 transition-transform">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                      {activityLogs.length} Events
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-slate-900 text-sm group-hover:text-slate-800 transition-colors flex items-center gap-1">
                      <span>Audit & Footprint</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Inspect IP clickstream, telemetry events & activity audit trail.
                    </p>
                  </div>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left flex flex-col justify-between">
                  <div className="flex items-center justify-between w-full">
                    <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center">
                      <Lock className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      Agent Restricted
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-slate-400 text-sm">Audit & Security</div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Telemetry & audit logs are restricted to Manager / Admin roles.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* DASHBOARD CARDS GRID: Clean, organized booking overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Card 1: Route & Flight Segments (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plane className="h-4 w-4 text-indigo-600" />
                    Flight Route & Schedule ({editFlights.length} Segments)
                  </span>
                  <button
                    onClick={() => setActiveWindow("booking_details")}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit Flights &rarr;</span>
                  </button>
                </div>

                {/* Primary Route Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-300 block uppercase">Origin</span>
                      <span className="text-xl font-mono font-extrabold tracking-tight">{primaryOrigin}</span>
                    </div>
                    <div className="flex flex-col items-center px-2">
                      <span className="text-[10px] font-mono text-indigo-300 uppercase">{editTripType}</span>
                      <ArrowRight className="h-5 w-5 text-indigo-300 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-indigo-300 block uppercase">Destination</span>
                      <span className="text-xl font-mono font-extrabold tracking-tight">{primaryDest}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-indigo-300 block uppercase">{primaryAirline}</span>
                    <span className="text-xs font-mono font-bold text-white block">{primaryDate}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/20 text-white mt-1 inline-block">
                      PNR: {editPnrCode || booking?.pnrCode || "NX-PNR"}
                    </span>
                  </div>
                </div>

                {/* Multi-leg list */}
                <div className="space-y-2 pt-1">
                  {editFlights.map((flt, idx) => (
                    <div key={flt.id || idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 font-mono">{flt.origin} &rarr; {flt.destination}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({flt.airline} {flt.flightNumber})</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                          {flt.cabinClass}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        📅 {flt.departureDate} {flt.departureTime ? `@ ${flt.departureTime}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Fare Pricing & MCO Profit (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Fare Pricing & Agent Commission
                    </span>
                    <button
                      onClick={() => setActiveWindow("booking_details")}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Adjust &rarr;</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block">
                        {isConfirmed ? "Sale Price" : "Sale Price (Agent Quote)"}
                      </span>
                      <span className="text-base font-mono font-extrabold text-slate-900 mt-0.5 block">
                        {editSalePrice > 0 || isConfirmed
                          ? formatCurrency(editSalePrice || lead.salePrice || lead.dealValue, editCurrency || lead.currency)
                          : <span className="text-amber-700 text-xs font-semibold">Awaiting Quote</span>}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block">Ticket Price (Site Cost)</span>
                      <span className="text-base font-mono font-bold text-slate-700 mt-0.5 block">
                        {formatCurrency(editTicketPrice || lead.ticketPrice || 0, editCurrency || lead.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Highlighted MCO Profit Banner */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 shadow-xs mt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-800 font-mono font-bold uppercase block">
                        Agent MCO (Earned)
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                        Agent Profit
                      </span>
                    </div>
                    <span className="text-lg font-mono font-extrabold text-emerald-800 mt-0.5 block">
                      {editSalePrice > 0 || isConfirmed
                        ? `+${formatCurrency(editMco || lead.mco || 0, editCurrency || lead.currency)}`
                        : <span className="text-slate-400 text-xs font-normal">-- (Enter quote in Edit Details)</span>}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                      MCO = Sale Price − Ticket Price (Earned by agent)
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveWindow("booking_details")}
                    className="w-full py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Open Price & MCO Calculator &rarr;</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Passenger Manifest Summary (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Passenger Manifest ({editPassengers.length} Travelers)
                  </span>
                  <button
                    onClick={() => setActiveWindow("booking_details")}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add / Edit Pax &rarr;</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editPassengers.map((pax, idx) => (
                    <div key={pax.id || idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block">{pax.fullName || "Passenger Name Pending"}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Type: {pax.type} &bull; Seat: {pax.seatPreference || "Auto"} &bull; Meal: {pax.mealPreference || "Standard"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px]">
                        <span className="text-slate-600 block">Passport: {pax.passportNumber || "On File"}</span>
                        {pax.eTicketNumber && (
                          <span className="text-cyan-800 font-bold text-[10px] flex items-center gap-1">
                            <FileBadge className="h-3 w-3 text-cyan-600 inline" />
                            {pax.eTicketNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Customer Details & Card Snapshot (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-cyan-600" />
                    Primary Customer & Security
                  </span>
                  <button
                    onClick={() => setActiveWindow("booking_details")}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit Contact &rarr;</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[10px] uppercase">Client Name</span>
                    <span className="font-bold text-slate-900">{editName || lead.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[10px] uppercase">Email</span>
                    <span className="font-mono text-indigo-700 font-semibold truncate max-w-[200px]">{editEmail || lead.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[10px] uppercase">Phone</span>
                    <span className="font-mono text-slate-800 font-semibold">{editPhone || lead.phone || "+1 (555) 019-2834"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[10px] uppercase">Assigned Agent</span>
                    <span className={`font-semibold ${lead.assignedToName ? "text-indigo-700 font-bold" : "text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold"}`}>
                      {lead.assignedToName || "⚠️ Unassigned (travelocase.com)"}
                    </span>
                  </div>
                </div>

                {/* Card Snapshot Bar */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-cyan-400" />
                    <div>
                      <span className="text-[10px] font-mono text-slate-300 block uppercase">Payment Method</span>
                      <span className="font-mono text-xs font-bold text-indigo-200">
                        {isCardUnmasked && isAuthorizedToUnmask ? (card?.cardNumber || `4532 •••• •••• ${last4}`) : `•••• •••• •••• ${last4}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveWindow("card_vault")}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-xs transition"
                  >
                    Open Vault &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DIGITAL FINGERPRINTS & QUERY REMARKS SECTION                              */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Digital Fingerprints & Query Remarks Feed
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Every opening and action is automatically fingerprinted &bull; Add query remarks below
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {lead.footprint?.clickstream?.length || 0} Fingerprint Entries
                  </span>
                  {lead.footprint?.ipAddress && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      IP: {lead.footprint.ipAddress}
                    </span>
                  )}
                </div>
              </div>

              {/* Remark Success Banner */}
              {remarkSuccessMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{remarkSuccessMessage}</span>
                  </div>
                </div>
              )}

              {/* Interactive Query Remark Composer */}
              <form onSubmit={handleLogRemark} className="p-3 rounded-xl bg-gradient-to-r from-purple-50/50 via-indigo-50/40 to-slate-50 border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                    <span>Enter Query / Action Remark</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">
                    Actor: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role})
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={quickRemark}
                    onChange={(e) => setQuickRemark(e.target.value)}
                    placeholder="Enter remark for this inquiry query (e.g., 'Discussed business class upgrade with client on phone')..."
                    className="flex-1 bg-white border border-purple-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={isLoggingRemark || !quickRemark.trim()}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isLoggingRemark ? "Logging..." : "Log Query Remark"}</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
                  <span>💡 If you do not enter a remark when opening/viewing, an auto-log entry is automatically created.</span>
                  <span>Press Enter to Submit</span>
                </div>
              </form>

              {/* Fingerprints & Remarks Timeline - LATEST ON TOP */}
              <div className="space-y-2 pt-1 max-h-72 overflow-y-auto pr-1">
                {(!lead.footprint?.clickstream || lead.footprint.clickstream.length === 0) ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-mono bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No fingerprint events recorded yet.
                  </div>
                ) : (
                  [...lead.footprint.clickstream]
                    .sort((a, b) => {
                      const timeA = new Date(a.timestamp).getTime();
                      const timeB = new Date(b.timestamp).getTime();
                      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                    })
                    .map((evt, idx) => {
                      const isManualRemark = !evt.isAutoLogged && (Boolean(evt.remark) || evt.event === "QUERY_REMARK_RECORDED");
                      const actorDisplayName = evt.actorName || (evt.isAutoLogged ? "System Sentinel" : (lead.assignedToName || "Sales Agent"));
                      const actorDisplayRole = evt.actorRole || (evt.actorName ? "User" : "System");
                      const remarkText = evt.remark || `Action '${evt.event.replace(/_/g, " ")}' recorded by ${actorDisplayName} (${actorDisplayRole})`;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition text-xs space-y-2 ${
                            isManualRemark
                              ? "bg-amber-50/80 border-amber-300 shadow-2xs"
                              : "bg-slate-50/90 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isManualRemark ? (
                                <span className="flex items-center gap-1 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-900 border border-amber-300">
                                  <MessageSquare className="h-3 w-3 text-amber-700" />
                                  Agent Remark
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300">
                                  <Bot className="h-3 w-3 text-indigo-600" />
                                  Auto Logged
                                </span>
                              )}

                              <span className="font-mono font-bold text-[11px] text-slate-900">
                                {evt.event.replace(/_/g, " ")}
                              </span>

                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                Actor: <strong className="text-slate-900">{actorDisplayName}</strong> ({actorDisplayRole})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                              <span title={evt.timestamp}>{formatDate(evt.timestamp)} &bull; {formatRelativeTime(evt.timestamp)}</span>
                            </div>
                          </div>

                          <div className={`p-2.5 rounded-lg text-xs leading-relaxed font-medium ${
                            isManualRemark
                              ? "bg-white border border-amber-300 text-amber-950 font-semibold shadow-2xs"
                              : "bg-white/90 border border-slate-200 text-slate-800"
                          }`}>
                            <div className="flex items-start gap-2">
                              {isManualRemark ? (
                                <MessageSquare className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                              ) : (
                                <Bot className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              )}
                              <span className="flex-1">{remarkText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WINDOW 2: DEDICATED SEND TRAVEL MAIL WINDOW                                */}
        {/* ========================================================================= */}
        {activeWindow === "email" && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 touch-scroll bg-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchWindow("overview")}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Back to Overview"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-purple-600" />
                    Send Travel Email & Itinerary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dispatches official branded email to customer with booking reference <strong className="text-indigo-700 font-mono">{bookingRef}</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetTemplateDefaults}
                className="flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Default Template</span>
              </button>
            </div>

            {/* Mandatory Official Sender Info Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-600">From Official Sender:</span>
                  <span className="px-2 py-0.5 rounded bg-white font-mono font-bold text-indigo-700 border border-indigo-200 text-[11px]">
                    {OFFICIAL_SENDER_EMAIL}
                  </span>
                  <span className="text-[10px] text-indigo-900/80">({OFFICIAL_SENDER_NAME})</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                SPF / DKIM Authenticated
              </div>
            </div>

            {/* Template Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Select Email Template Preset:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {PREDEFINED_EMAIL_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`p-2.5 rounded-xl text-left text-xs border transition ${
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
            </div>

            {/* Editable Fields: Recipient Email, Subject, and Rich Text Body */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              {/* 1. Editable Recipient Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-indigo-600" />
                    To (Recipient Customer Email):
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Must be valid email</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                  placeholder="Enter customer recipient email..."
                  className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 2. Editable Email Subject with Booking ID Enforcement */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                    Subject Line (Auto-includes Booking ID):
                  </label>
                  <button
                    type="button"
                    onClick={handleInsertBookingIdPrefix}
                    className="text-[10px] font-mono text-cyan-800 hover:text-cyan-900 bg-cyan-50 border border-cyan-300 px-2 py-0.5 rounded transition font-medium"
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
                  className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 3. Rich Text Email Body with Image Paste Support */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Message Body (Rich Text Tools & Screenshot Paste Enabled):</span>
                  <span className="text-[10px] font-mono text-indigo-600">Press Ctrl+V to paste flight screenshots</span>
                </label>
                <RichTextEmailEditor
                  value={customBody}
                  onChange={setCustomBody}
                  minHeight="220px"
                  maxHeight="380px"
                />
              </div>
            </div>

            {/* Send Button Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {emailSentSuccess ? (
                <span className="text-xs font-mono text-emerald-700 flex items-center gap-1.5 font-semibold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> 
                  Email Dispatched Successfully to {recipientEmail}!
                </span>
              ) : (
                <span className="text-xs text-slate-500 truncate">
                  Ready to dispatch to <strong className="text-slate-800">{recipientEmail || lead.email || "customer"}</strong>
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchWindow("overview")}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Done & Return to Overview
                </button>
                <button
                  disabled={isSendingEmail}
                  onClick={handleSendEmail}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-95 shrink-0 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSendingEmail ? "Dispatching Email..." : "Send Travel Email"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WINDOW 3: DEDICATED ADD / EDIT BOOKING DETAILS WINDOW                      */}
        {/* ========================================================================= */}
        {activeWindow === "booking_details" && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 touch-scroll bg-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Back to Overview (Cancel)"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Plane className="h-4 w-4 text-indigo-600" />
                    Edit Booking Details, Flights & Passengers
                  </h2>
                  <p className="text-xs text-slate-500">
                    Modify contact information, pricing quote & MCO, multi-leg flights, and passenger manifest.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingDetails ? "Saving Details..." : "Save All Changes"}</span>
                </button>
              </div>
            </div>

            {/* SECTION 1: CUSTOMER CONTACT DETAILS */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-cyan-600" />
                Primary Customer & Account Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Passenger / Account Name"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Company / Org</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="Individual or Corporate"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: FINANCIAL PRICING & MCO COMMISSION CALCULATOR */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-emerald-50/60 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Fare Pricing & Agent MCO Commission Calculator
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full">
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
                    Ticket Price (Cost)
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

            {/* SECTION 3: FLIGHT SEGMENTS & ROUTE */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plane className="h-4 w-4 text-indigo-600" />
                  Flight Itinerary & Segments ({editFlights.length} Legs)
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={editTripType}
                    onChange={(e) => setEditTripType(e.target.value as any)}
                    className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-white text-indigo-700 border border-indigo-300 cursor-pointer"
                  >
                    <option value="ROUND_TRIP">ROUND TRIP</option>
                    <option value="ONE_WAY">ONE WAY</option>
                    <option value="MULTI_CITY">MULTI CITY</option>
                  </select>

                  <input
                    type="text"
                    value={editPnrCode}
                    onChange={(e) => setEditPnrCode(e.target.value.toUpperCase())}
                    placeholder="PNR CODE"
                    className="bg-white border border-indigo-300 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-900 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[120px]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {editFlights.map((flt, fIdx) => (
                  <div key={flt.id || fIdx} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold">
                        Flight Leg #{fIdx + 1}
                      </span>
                      {editFlights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFlight(fIdx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                          title="Remove this flight leg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Origin (From)</label>
                        <input
                          type="text"
                          value={flt.origin}
                          onChange={(e) => handleUpdateFlight(fIdx, "origin", e.target.value)}
                          placeholder="e.g. JFK (New York)"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Destination (To)</label>
                        <input
                          type="text"
                          value={flt.destination}
                          onChange={(e) => handleUpdateFlight(fIdx, "destination", e.target.value)}
                          placeholder="e.g. LHR (London)"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Airline</label>
                        <input
                          type="text"
                          value={flt.airline}
                          onChange={(e) => handleUpdateFlight(fIdx, "airline", e.target.value)}
                          placeholder="Airline Name"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Flight Number</label>
                        <input
                          type="text"
                          value={flt.flightNumber}
                          onChange={(e) => handleUpdateFlight(fIdx, "flightNumber", e.target.value)}
                          placeholder="e.g. AA 100"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Departure Date</label>
                        <input
                          type="date"
                          value={flt.departureDate}
                          onChange={(e) => handleUpdateFlight(fIdx, "departureDate", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Departure Time</label>
                        <input
                          type="text"
                          value={flt.departureTime || ""}
                          onChange={(e) => handleUpdateFlight(fIdx, "departureTime", e.target.value)}
                          placeholder="08:30 AM"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Arrival Time</label>
                        <input
                          type="text"
                          value={flt.arrivalTime || ""}
                          onChange={(e) => handleUpdateFlight(fIdx, "arrivalTime", e.target.value)}
                          placeholder="08:45 PM"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase block font-semibold mb-0.5">Cabin Class</label>
                        <select
                          value={flt.cabinClass}
                          onChange={(e) => handleUpdateFlight(fIdx, "cabinClass", e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="ECONOMY">Economy</option>
                          <option value="PREMIUM_ECONOMY">Premium Economy</option>
                          <option value="BUSINESS">Business Class</option>
                          <option value="FIRST">First Class</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddFlight}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Another Flight Leg / Connection</span>
              </button>
            </div>

            {/* SECTION 4: PASSENGER MANIFEST */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                Passenger Manifest ({editPassengers.length} Travelers)
              </span>

              <div className="space-y-3">
                {editPassengers.map((pax, idx) => (
                  <div key={pax.id || idx} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={pax.fullName}
                          onChange={(e) => handleUpdatePassenger(idx, "fullName", e.target.value)}
                          placeholder="Passenger Full Name"
                          className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      {editPassengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                          title="Remove passenger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-mono block">Pax Type</label>
                        <select
                          value={pax.type}
                          onChange={(e) => handleUpdatePassenger(idx, "type", e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-mono block">Passport Expiry</label>
                        <input
                          type="date"
                          value={pax.passportExpiry || ""}
                          onChange={(e) => handleUpdatePassenger(idx, "passportExpiry", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-mono block">Nationality</label>
                        <input
                          type="text"
                          value={pax.nationality || ""}
                          onChange={(e) => handleUpdatePassenger(idx, "nationality", e.target.value)}
                          placeholder="Nationality"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-mono block">Assigned Seat</label>
                        <input
                          type="text"
                          value={pax.seatPreference || ""}
                          onChange={(e) => handleUpdatePassenger(idx, "seatPreference", e.target.value)}
                          placeholder="e.g. 14B / Window"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-mono block">Meal Choice</label>
                        <input
                          type="text"
                          value={pax.mealPreference || ""}
                          onChange={(e) => handleUpdatePassenger(idx, "mealPreference", e.target.value)}
                          placeholder="e.g. Vegan / Kosher"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-mono block">E-Ticket Number</label>
                        <input
                          type="text"
                          value={pax.eTicketNumber || ""}
                          onChange={(e) => handleUpdatePassenger(idx, "eTicketNumber", e.target.value)}
                          placeholder="e.g. ETKT-001-9428"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono text-cyan-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddPassenger}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Another Passenger</span>
              </button>
            </div>

            {/* Sticky Save Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel & Return
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={isSavingDetails}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingDetails ? "Saving All Details..." : "Save All Details"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WINDOW 4: DEDICATED PCI CARD VAULT & CLEARANCE WINDOW                      */}
        {/* ========================================================================= */}
        {activeWindow === "card_vault" && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 touch-scroll bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchWindow("overview")}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Back to Overview"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-cyan-600" />
                    PCI Card Security Vault & Payment Clearance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Complies with PCI-DSS card masking standards and logs all views into the digital audit trail.
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 text-cyan-800 border border-slate-300 font-bold">
                {card?.cardType || "VISA"}
              </span>
            </div>

            {/* 3-Minute Active Visibility Countdown Widget */}
            {card?.isAccessGrantedToAgent && remainingCardSeconds !== null && remainingCardSeconds > 0 && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-emerald-900">
                    {isSalesAgent ? "Card Access Active (3-Minute Window)" : `Clearance Active for ${lead.assignedToName || "Agent"}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs px-3 py-1 rounded-lg bg-white text-emerald-800 border border-emerald-300 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                  <span>{Math.floor(remainingCardSeconds / 60)}:{(remainingCardSeconds % 60).toString().padStart(2, "0")}</span>
                  <span className="text-[10px] text-emerald-600 font-normal">remaining</span>
                </div>
              </div>
            )}

            {/* 3-Minute Access Expired Banner */}
            {isCardExpired && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between text-rose-800 shadow-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Card access expired (3-minute authorization elapsed)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                  Re-mask Enforced
                </span>
              </div>
            )}

            {/* Masked Card Visual Card Graphic */}
            <div className="max-w-md mx-auto p-5 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 border border-slate-700 text-xs space-y-4 text-white shadow-xl">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span className="tracking-widest">TRAVELOCASE VAULT</span>
                <span className="font-bold text-cyan-300">{card?.cardType || "VISA"}</span>
              </div>
              
              <div className="text-sm sm:text-base font-bold text-white tracking-wider truncate pt-2">
                {card?.cardholderName || lead.name.toUpperCase()}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">CARD NUMBER</span>
                  <div className="text-base sm:text-lg font-mono font-bold tracking-widest text-indigo-300">
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
            <div className="max-w-md mx-auto space-y-2">
              {isAuthorizedToUnmask ? (
                <div className="space-y-1.5">
                  <button
                    onClick={handleRevealCard}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                  >
                    {isCardUnmasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{isCardUnmasked ? "Hide Unmasked Card (Logged)" : "Reveal Unmasked Card (Logged to Footprint)"}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center font-mono">
                    ⚠️ Viewing and concealing card details are permanently logged into the digital footprint with actor ({currentUser.name}) and timestamp.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <Lock className="h-4 w-4" />
                    <span>Card Partially Hidden for Sales Agent</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Card numbers and CVV are masked. Send authentication email to customer, verify on call, then request <strong>Sales Manager</strong> clearance for a 3-minute view window.
                  </p>
                </div>
              )}

              {/* Manager Grant Authority Panel */}
              {isManagerOrAdmin && (!card?.isAccessGrantedToAgent || remainingCardSeconds === 0) && (
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Unlock className="h-4 w-4 text-indigo-600" />
                      Manager Card Clearance
                    </span>
                    <span className="text-[10px] font-mono text-indigo-700 font-semibold">Manager Role</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Grant <strong>3-minute temporary card access</strong> to assigned agent (<strong>{lead.assignedToName || "Sales Agent"}</strong>).
                  </p>
                  <button
                    disabled={isGrantingCard}
                    onClick={handleGrantCardClearance}
                    className="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{isGrantingCard ? "Authorizing 3-Min Access..." : (isCardExpired ? "Renew 3-Minute Clearance for Agent" : "Grant 3-Minute Card Access to Agent")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WINDOW 5: DEDICATED AUDIT TRAIL & TELEMETRY WINDOW (MANAGER/ADMIN)         */}
        {/* ========================================================================= */}
        {activeWindow === "audit" && canViewFootprint && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 touch-scroll bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchWindow("overview")}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Back to Overview"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    Digital Footprint & Audit Telemetry
                  </h2>
                  <p className="text-xs text-slate-500">
                    Permanent immutable audit records, IP telemetry clickstream, and actor query remarks.
                  </p>
                </div>
              </div>

              {lead.footprint?.ipAddress && (
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                  IP: {lead.footprint.ipAddress}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Digital Footprint Clickstream */}
              {lead.footprint && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-purple-600" />
                      Fingerprints & Clickstream Telemetry
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                      {lead.footprint.clickstream?.length || 0} Events
                    </span>
                  </div>

                  <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200 max-h-96 overflow-y-auto pr-1">
                    {[...lead.footprint.clickstream]
                      .sort((a, b) => {
                        const timeA = new Date(a.timestamp).getTime();
                        const timeB = new Date(b.timestamp).getTime();
                        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                      })
                      .map((evt, idx) => {
                        const isManualRemark = !evt.isAutoLogged && (Boolean(evt.remark) || evt.event === "QUERY_REMARK_RECORDED");
                        const actorDisplayName = evt.actorName || (evt.isAutoLogged ? "System Sentinel" : (lead.assignedToName || "Sales Agent"));
                        const actorDisplayRole = evt.actorRole || (evt.actorName ? "User" : "System");
                        const remarkText = evt.remark || `Action '${evt.event.replace(/_/g, " ")}' recorded by ${actorDisplayName} (${actorDisplayRole})`;

                        return (
                          <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                            <div className={`absolute left-1 top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                              isManualRemark ? "bg-amber-500 ring-2 ring-amber-200" : "bg-indigo-500"
                            }`} />
                            <div className={`flex-1 p-2.5 rounded-lg border ${
                              isManualRemark ? "bg-amber-50/80 border-amber-300 shadow-2xs" : "bg-white border-slate-200"
                            }`}>
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isManualRemark ? (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">
                                      Agent Remark
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                      Auto
                                    </span>
                                  )}
                                  <span className="font-mono font-bold text-[11px] text-slate-900">{evt.event}</span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                    Actor: <strong>{actorDisplayName}</strong> ({actorDisplayRole})
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">{formatDate(evt.timestamp)} &bull; {formatRelativeTime(evt.timestamp)}</span>
                              </div>

                              <div className={`mt-1.5 p-2 rounded text-[11px] leading-relaxed font-medium ${
                                isManualRemark ? "bg-white border border-amber-300 text-amber-950 font-semibold shadow-2xs" : "bg-slate-50 text-slate-700 border border-slate-200"
                              }`}>
                                <div className="flex items-start gap-1.5">
                                  {isManualRemark ? (
                                    <MessageSquare className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <Bot className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
                                  )}
                                  <span>{remarkText}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                                <span>Actor ID: <strong className="text-slate-700">{evt.actorId || "N/A"}</strong></span>
                                <span>{evt.url}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Activity Audit Trail */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  Lead Audit Trail Logs ({activityLogs.length})
                </span>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {activityLogs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-mono">No activity logged yet</div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
