"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lead, Passenger, FlightSegment, AttachedDocument } from "@/types";
import {
  Megaphone,
  RefreshCw,
  Edit2,
  Plus,
  Check,
  X,
  Plane,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Save,
  ChevronRight,
  Info,
  FileText,
  Upload,
  Download,
  Trash2,
  Paperclip,
  CheckCircle2,
  Mail,
  Send,
  Sparkles,
} from "lucide-react";
import { PREDEFINED_EMAIL_TEMPLATES, renderEmailTemplate, OFFICIAL_SENDER_EMAIL } from "@/lib/templates";

interface SimpleReservationViewProps {
  lead: Lead | null;
  onRefresh?: () => Promise<void> | void;
  onSaveLead?: (updatedLead: Lead) => Promise<void> | void;
  onClose?: () => void;
  initialTab?: "traveller" | "contact" | "flight" | "documents" | "payment";
}

export function SimpleReservationView({
  lead,
  onRefresh,
  onSaveLead,
  onClose,
  initialTab = "traveller",
}: SimpleReservationViewProps) {
  const [activeTab, setActiveTab] = useState<"traveller" | "contact" | "flight" | "documents" | "payment">(initialTab);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sensitive Field Masking Toggles
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showAltEmail, setShowAltEmail] = useState(true);
  const [showAltPhone, setShowAltPhone] = useState(true);

  // Confirmation Number State & Inline Editing
  const [confirmationNumber, setConfirmationNumber] = useState<string>("");
  const [isEditingConfirmation, setIsEditingConfirmation] = useState(false);
  const [tempConfirmation, setTempConfirmation] = useState("");

  // Documents / PDF State
  const [documents, setDocuments] = useState<AttachedDocument[]>([]);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [previewPdfDoc, setPreviewPdfDoc] = useState<AttachedDocument | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Send Mail Modal State
  const [isSendMailModalOpen, setIsSendMailModalOpen] = useState(false);
  const [selectedMailTemplateId, setSelectedMailTemplateId] = useState<string>("flight_auth_01");
  const [mailRecipient, setMailRecipient] = useState<string>(lead?.email || "");
  const [mailSubject, setMailSubject] = useState<string>("");
  const [mailBody, setMailBody] = useState<string>("");
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailSentSuccess, setMailSentSuccess] = useState(false);

  // Initialize/update mail template
  useEffect(() => {
    if (lead) {
      setMailRecipient(lead.email || "");
      const template = PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === selectedMailTemplateId) || PREDEFINED_EMAIL_TEMPLATES[0];
      const rendered = renderEmailTemplate(template, lead, "Reservations Specialist");
      setMailSubject(rendered.subject);
      setMailBody(rendered.body);
    }
  }, [lead, selectedMailTemplateId]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedMailTemplateId(templateId);
    if (lead) {
      const template = PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === templateId) || PREDEFINED_EMAIL_TEMPLATES[0];
      const rendered = renderEmailTemplate(template, lead, "Reservations Specialist");
      setMailSubject(rendered.subject);
      setMailBody(rendered.body);
    }
  };

  const handleDispatchEmail = async () => {
    if (!lead) return;
    setIsSendingMail(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedMailTemplateId,
          actorId: "agent_simple_desk",
          senderEmail: OFFICIAL_SENDER_EMAIL,
          recipientEmail: mailRecipient.trim() || lead.email,
          subject: mailSubject,
          body: mailBody,
        }),
      });
      if (res.ok) {
        setMailSentSuccess(true);
        setTimeout(() => {
          setMailSentSuccess(false);
          setIsSendMailModalOpen(false);
        }, 2500);
        if (onRefresh) await onRefresh();
      } else {
        alert("Failed to send email");
      }
    } catch (err) {
      console.error("Email dispatch failed:", err);
      alert("Error sending email");
    } finally {
      setIsSendingMail(false);
    }
  };

  // Live PST Date/Time Clock
  const [pstTimeStr, setPstTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
          timeZone: "America/Los_Angeles",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        };
        const formatter = new Intl.DateTimeFormat("en-US", options);
        const parts = formatter.formatToParts(now);
        const day = parts.find((p) => p.type === "day")?.value || "";
        const month = parts.find((p) => p.type === "month")?.value || "";
        const year = parts.find((p) => p.type === "year")?.value || "";
        const hour = parts.find((p) => p.type === "hour")?.value || "";
        const minute = parts.find((p) => p.type === "minute")?.value || "";
        const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value || "AM";

        setPstTimeStr(`Today ${day} ${month}, ${year}, PST - ${hour}:${minute} ${dayPeriod}`);
      } catch {
        setPstTimeStr("Today 21 Sep, 2026, PST - 12:02 PM");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Passenger state & editing
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [editingPaxIndex, setEditingPaxIndex] = useState<number | null>(null);
  const [editingPaxData, setEditingPaxData] = useState<Passenger | null>(null);
  const [isAddingPax, setIsAddingPax] = useState(false);

  // Contact & Billing Address editing
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactData, setContactData] = useState({
    email: "",
    alternateEmail: "",
    phone: "",
    alternatePhone: "",
    address: "",
    state: "",
    city: "",
    postalCode: "",
    country: "",
  });

  // Flight Itinerary editing
  const [isItineraryModalOpen, setIsItineraryModalOpen] = useState(false);
  const [flights, setFlights] = useState<FlightSegment[]>([]);

  // Sync state with incoming lead
  useEffect(() => {
    if (!lead) return;

    // Confirmation Number
    const conf =
      lead.confirmationNumber ||
      lead.bookingDetails?.confirmationNumber ||
      lead.bookingDetails?.pnrCode ||
      lead.bookingId ||
      "AA-982143";
    setConfirmationNumber(conf);
    setTempConfirmation(conf);

    // Documents
    const docs = lead.documents || lead.bookingDetails?.documents || [
      {
        id: "doc_default_1",
        name: `ETicket_Itinerary_${conf}.pdf`,
        size: "248 KB",
        type: "application/pdf",
        uploadedAt: new Date().toISOString(),
      },
    ];
    setDocuments(docs);

    // Contact info
    setContactData({
      email: lead.email || "josecruz959@gmail.com",
      alternateEmail: lead.alternateEmail || "",
      phone: lead.phone || "+1-2537548903",
      alternatePhone: lead.alternatePhone || "",
      address: lead.address || "9 Delafield Dr",
      state: lead.state || "MISSOURI",
      city: lead.city || "Fort Leonard Wood",
      postalCode: lead.postalCode || "65473",
      country: lead.country || "US",
    });

    // Passengers
    if (lead.bookingDetails?.passengers && lead.bookingDetails.passengers.length > 0) {
      setPassengers(lead.bookingDetails.passengers);
    } else {
      const defaultPax: Passenger[] = [
        {
          id: "pax_1",
          fullName: lead.name || "Jose Emilio Cruz Gomez",
          title: "Mr",
          firstName: lead.name?.split(" ")[0] || "Jose",
          middleName: lead.name?.split(" ")[1] || "Emilio",
          lastName: lead.name?.split(" ").slice(2).join(" ") || "CruzGomez",
          type: "Adult",
          gender: "Male",
          dob: "10/10/1978",
          nationality: "US",
        },
      ];
      setPassengers(defaultPax);
    }

    // Dynamic Flight Itinerary Binding
    if (lead.bookingDetails?.flights && lead.bookingDetails.flights.length > 0) {
      setFlights(lead.bookingDetails.flights);
    } else {
      const orig = lead.bookingDetails?.origin || "JFK";
      const dest = lead.bookingDetails?.destination || "LHR";
      const airl = lead.bookingDetails?.airline || "American Airlines";
      const fltNum = lead.bookingDetails?.flightNumber || "AA-3484";
      const depDate = lead.bookingDetails?.departureDate || "Wed, Jul 16";
      const depTime = lead.bookingDetails?.departureTime || "06:00 AM";
      const arrDate = lead.bookingDetails?.arrivalDate || depDate;
      const arrTime = lead.bookingDetails?.arrivalTime || "10:14 AM";
      const cabin = lead.bookingDetails?.cabinClass || "Economy";
      const tripType = lead.bookingDetails?.tripType || "ONE_WAY";
      const retDate = lead.bookingDetails?.returnDate;

      const synthesizedFlights: FlightSegment[] = [
        {
          id: `flt_dept_1`,
          airline: airl,
          airlineCode: airl.substring(0, 2).toUpperCase(),
          flightNumber: fltNum,
          confirmationNumber: conf,
          origin: orig,
          originName: `${orig} International Airport`,
          destination: dest,
          destinationName: `${dest} International Airport`,
          departureDate: depDate,
          departureTime: depTime,
          arrivalDate: arrDate,
          arrivalTime: arrTime,
          duration: "04h 14m",
          cabinClass: cabin,
          legGroup: "DEPART",
          routeLabel: `${orig} To ${dest}`,
        },
      ];

      if (tripType === "ROUND_TRIP" || Boolean(retDate)) {
        synthesizedFlights.push({
          id: `flt_ret_1`,
          airline: airl,
          airlineCode: airl.substring(0, 2).toUpperCase(),
          flightNumber: `${airl.substring(0, 2).toUpperCase()}-2038`,
          confirmationNumber: conf,
          origin: dest,
          originName: `${dest} International Airport`,
          destination: orig,
          destinationName: `${orig} International Airport`,
          departureDate: retDate || "Sun, Jul 20",
          departureTime: "07:30 PM",
          arrivalDate: retDate || "Sun, Jul 20",
          arrivalTime: "11:39 PM",
          duration: "04h 09m",
          cabinClass: cabin,
          legGroup: "RETURN",
          routeLabel: `${dest} To ${orig}`,
        });
      }

      setFlights(synthesizedFlights);
    }
  }, [lead]);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Confirmation Number Save Handler
  const handleSaveConfirmationNumber = () => {
    const trimmed = tempConfirmation.trim() || confirmationNumber;
    setConfirmationNumber(trimmed);
    setIsEditingConfirmation(false);
    if (lead && onSaveLead) {
      onSaveLead({
        ...lead,
        confirmationNumber: trimmed,
        bookingDetails: {
          ...lead.bookingDetails!,
          confirmationNumber: trimmed,
        },
      });
    }
  };

  // PDF File Upload Handler
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const newDoc: AttachedDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        size: sizeStr,
        type: file.type || "application/pdf",
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      setIsUploadingPdf(false);
      setUploadSuccessMsg(`✓ Successfully uploaded ${file.name}`);
      setTimeout(() => setUploadSuccessMsg(null), 4000);

      if (lead && onSaveLead) {
        onSaveLead({
          ...lead,
          documents: updatedDocs,
          bookingDetails: {
            ...lead.bookingDetails!,
            documents: updatedDocs,
          },
        });
      }
    };

    reader.readAsDataURL(file);
    // Reset file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = (docId: string) => {
    const updated = documents.filter((d) => d.id !== docId);
    setDocuments(updated);
    if (lead && onSaveLead) {
      onSaveLead({
        ...lead,
        documents: updated,
        bookingDetails: {
          ...lead.bookingDetails!,
          documents: updated,
        },
      });
    }
  };

  // Edit Passenger Handler
  const handleStartEditPax = (index: number) => {
    setEditingPaxIndex(index);
    setEditingPaxData({ ...passengers[index] });
  };

  const handleSavePaxEdit = () => {
    if (editingPaxIndex === null || !editingPaxData) return;
    const updated = [...passengers];
    updated[editingPaxIndex] = editingPaxData;
    setPassengers(updated);
    setEditingPaxIndex(null);
    setEditingPaxData(null);
    if (lead && onSaveLead) {
      onSaveLead({
        ...lead,
        bookingDetails: {
          ...lead.bookingDetails!,
          passengers: updated,
        },
      });
    }
  };

  const handleAddPassenger = () => {
    const newPax: Passenger = {
      id: `pax_${Date.now()}`,
      title: "Mr",
      type: "Adult",
      firstName: "",
      middleName: "",
      lastName: "",
      fullName: "",
      gender: "Male",
      dob: "01/01/1990",
      nationality: "US",
    };
    setEditingPaxData(newPax);
    setIsAddingPax(true);
  };

  const handleSaveNewPax = () => {
    if (!editingPaxData) return;
    const updated = [
      ...passengers,
      {
        ...editingPaxData,
        fullName: `${editingPaxData.firstName || ""} ${editingPaxData.middleName || ""} ${editingPaxData.lastName || ""}`.trim() || "New Passenger",
      },
    ];
    setPassengers(updated);
    setIsAddingPax(false);
    setEditingPaxData(null);
    if (lead && onSaveLead) {
      onSaveLead({
        ...lead,
        bookingDetails: {
          ...lead.bookingDetails!,
          passengers: updated,
        },
      });
    }
  };

  const handleSaveContact = () => {
    setIsEditingContact(false);
    if (lead && onSaveLead) {
      onSaveLead({
        ...lead,
        email: contactData.email,
        alternateEmail: contactData.alternateEmail,
        phone: contactData.phone,
        alternatePhone: contactData.alternatePhone,
        address: contactData.address,
        state: contactData.state,
        city: contactData.city,
        postalCode: contactData.postalCode,
        country: contactData.country,
      });
    }
  };

  // Group flights into Depart and Return
  const departFlights = flights.filter((f) => f.legGroup === "DEPART" || (!f.legGroup && flights.indexOf(f) < 2));
  const returnFlights = flights.filter((f) => f.legGroup === "RETURN" || (!f.legGroup && flights.indexOf(f) >= 2));

  return (
    <div className="min-h-full w-full bg-[#f8fafc] text-slate-800 font-sans flex flex-col selection:bg-blue-100">
      {/* Hidden File Input for PDF Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handlePdfFileChange}
        className="hidden"
      />

      {/* 1. TOP POLICY & COMPLIANCE BANNER */}
      <div className="w-full bg-[#fee2e2] border-b border-[#fca5a5] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-[#991b1b] tracking-wide">
          <span className="text-base leading-none select-none">📢</span>
          <span>CARD NUMBER, EMAIL ADDRESS AND PHONE NUMBER MUST NOT BE SHARED ON EMAIL || Any sale done on fresh call must be uploaded on CRM using IMPORT TOOL</span>
        </div>

        {/* Live Date / Time & Clock */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/60 px-2.5 py-1 rounded border border-rose-200/80">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{pstTimeStr || "Today 8 Jan, 2026, PST - 12:02 PM"}</span>
        </div>
      </div>

      {/* 2. SUB-HEADER WITH CONFIRMATION NUMBER & TOP ACTIONS */}
      <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-400 font-mono uppercase">
            PNR: <strong className="text-slate-800 text-sm">{lead?.bookingDetails?.pnrCode || lead?.bookingId || "YAK33K"}</strong>
          </span>

          {/* EDITABLE CONFIRMATION NUMBER */}
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded text-xs">
            <span className="font-bold text-blue-900 font-mono uppercase text-[11px]">Confirmation #:</span>
            {isEditingConfirmation ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempConfirmation}
                  onChange={(e) => setTempConfirmation(e.target.value)}
                  className="px-1.5 py-0.5 border border-blue-400 rounded text-xs font-mono font-bold bg-white focus:outline-none max-w-[130px]"
                  placeholder="e.g. AA-982143"
                  autoFocus
                />
                <button
                  onClick={handleSaveConfirmationNumber}
                  className="p-1 text-emerald-700 hover:text-emerald-900"
                  title="Save Confirmation Number"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingConfirmation(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <strong className="font-mono text-blue-950 font-bold">{confirmationNumber}</strong>
                <button
                  onClick={() => {
                    setTempConfirmation(confirmationNumber);
                    setIsEditingConfirmation(true);
                  }}
                  className="p-0.5 text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  title="Edit Confirmation Number"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {lead?.bookingNumber && (
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200">
              #{lead.bookingNumber}
            </span>
          )}

          {/* Attached PDF Quick Count */}
          {documents.length > 0 && (
            <button
              onClick={() => setActiveTab("documents")}
              className="flex items-center gap-1 text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold px-2 py-0.5 rounded border border-purple-200 transition cursor-pointer"
            >
              <FileText className="w-3 h-3 text-purple-600" />
              <span>{documents.length} PDF Attached</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* UPLOAD PDF / E-TICKET BUTTON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPdf}
            className="bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-70"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploadingPdf ? "Uploading..." : "Upload PDF"}</span>
          </button>

          {/* Action Buttons for Flight Tab */}
          {activeTab === "flight" && (
            <>
              <button
                onClick={() => setIsItineraryModalOpen(true)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer shadow-xs"
              >
                Change Itinerary-Static
              </button>
              <button
                onClick={() => setIsItineraryModalOpen(true)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer shadow-xs"
              >
                Change Itinerary...
              </button>
            </>
          )}

          {/* SEND TRAVEL MAIL BUTTON */}
          <button
            onClick={() => setIsSendMailModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Compose & Send Travel Email to Passenger"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send Mail</span>
          </button>

          {/* Solid Blue Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-2"
              title="Close View"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Upload Success Toast Banner */}
      {uploadSuccessMsg && (
        <div className="w-full bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs text-emerald-800 font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{uploadSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUploadSuccessMsg(null)}
            className="text-emerald-700 hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT BODY: SIDEBAR + DETAIL VIEW */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[550px]">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside className="w-full md:w-56 lg:w-64 bg-[#f1f5f9] border-r border-slate-200 p-3 sm:p-4 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("traveller")}
            className={`w-full text-left px-4 py-2.5 rounded text-xs sm:text-[13px] font-medium transition cursor-pointer whitespace-nowrap ${
              activeTab === "traveller"
                ? "bg-[#3b82f6] text-white font-semibold shadow-xs"
                : "text-slate-700 hover:bg-slate-200/70"
            }`}
          >
            Traveller Information
          </button>

          <button
            onClick={() => setActiveTab("contact")}
            className={`w-full text-left px-4 py-2.5 rounded text-xs sm:text-[13px] font-medium transition cursor-pointer whitespace-nowrap ${
              activeTab === "contact"
                ? "bg-[#3b82f6] text-white font-semibold shadow-xs"
                : "text-slate-700 hover:bg-slate-200/70"
            }`}
          >
            Contact & Billing Address
          </button>

          <button
            onClick={() => setActiveTab("flight")}
            className={`w-full text-left px-4 py-2.5 rounded text-xs sm:text-[13px] font-medium transition cursor-pointer whitespace-nowrap ${
              activeTab === "flight"
                ? "bg-[#3b82f6] text-white font-semibold shadow-xs"
                : "text-slate-700 hover:bg-slate-200/70"
            }`}
          >
            Flight Information
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`w-full text-left px-4 py-2.5 rounded text-xs sm:text-[13px] font-medium transition cursor-pointer whitespace-nowrap flex items-center justify-between ${
              activeTab === "documents"
                ? "bg-[#3b82f6] text-white font-semibold shadow-xs"
                : "text-slate-700 hover:bg-slate-200/70"
            }`}
          >
            <span>PDF Documents / E-Tickets</span>
            {documents.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === "documents" ? "bg-white text-blue-700" : "bg-blue-100 text-blue-800"
              }`}>
                {documents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("payment")}
            className={`w-full text-left px-4 py-2.5 rounded text-xs sm:text-[13px] font-medium transition cursor-pointer whitespace-nowrap ${
              activeTab === "payment"
                ? "bg-[#3b82f6] text-white font-semibold shadow-xs"
                : "text-slate-700 hover:bg-slate-200/70"
            }`}
          >
            Card / Payment Details
          </button>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 bg-[#ffffff] p-4 sm:p-8 overflow-y-auto">
          {/* ========================================================================= */}
          {/* TAB 1: TRAVELLER INFORMATION                                              */}
          {/* ========================================================================= */}
          {activeTab === "traveller" && (
            <div className="w-full max-w-5xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Traveller Information
                </h2>
                <button
                  onClick={handleAddPassenger}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Traveller</span>
                </button>
              </div>

              {/* Data Table */}
              <div className="border border-slate-300 rounded overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f1f5f9] text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2.5 px-3 border-r border-slate-200">Title</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Pax Type</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">First Name</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Middle Name</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Last Name</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Gender</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">DOB</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {passengers.map((pax, idx) => (
                      <tr key={pax.id || idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 border-r border-slate-200 font-medium">
                          {pax.title || (pax.gender === "Female" ? "Ms" : "Mr")}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-medium">
                          {pax.type || "Adult"}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          {pax.firstName || pax.fullName?.split(" ")[0] || "-"}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          {pax.middleName || (pax.fullName?.split(" ").length > 2 ? pax.fullName.split(" ")[1] : "-")}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          {pax.lastName || pax.fullName?.split(" ").slice(-1)[0] || "-"}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          {pax.gender || "Male"}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono">
                          {pax.dob || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleStartEditPax(idx)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CONTACT & BILLING ADDRESS                                          */}
          {/* ========================================================================= */}
          {activeTab === "contact" && (
            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Contact & Billing Address
                </h2>
                {!isEditingContact ? (
                  <button
                    onClick={() => setIsEditingContact(true)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded border border-slate-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingContact(false)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveContact}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1 rounded flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bordered Key-Value Box */}
              <div className="border border-slate-300 rounded overflow-hidden shadow-2xs">
                <div className="bg-[#f1f5f9] px-4 py-2 border-b border-slate-300 font-bold text-xs text-slate-800">
                  Contact & Billing Address
                </div>

                <div className="divide-y divide-slate-200 text-xs">
                  {/* Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-white hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">Email</span>
                    <div className="flex-1 flex items-center justify-between gap-2 mt-1 sm:mt-0">
                      {isEditingContact ? (
                        <input
                          type="email"
                          value={contactData.email}
                          onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                          className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                        />
                      ) : (
                        <span className="text-slate-700 font-medium">
                          {showEmail ? contactData.email : "••••••••••••@•••••.com"}
                        </span>
                      )}
                      {!isEditingContact && (
                        <button
                          onClick={() => setShowEmail(!showEmail)}
                          className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold hover:underline cursor-pointer select-none"
                        >
                          {showEmail ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alternate Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-[#fcfcfc] hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">Alternate Email</span>
                    <div className="flex-1 flex items-center justify-between gap-2 mt-1 sm:mt-0">
                      {isEditingContact ? (
                        <input
                          type="email"
                          value={contactData.alternateEmail}
                          onChange={(e) => setContactData({ ...contactData, alternateEmail: e.target.value })}
                          placeholder="Optional alternate email"
                          className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                        />
                      ) : (
                        <span className="text-slate-500 italic">{contactData.alternateEmail || ""}</span>
                      )}
                      {!isEditingContact && contactData.alternateEmail && (
                        <button
                          onClick={() => setShowAltEmail(!showAltEmail)}
                          className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold hover:underline cursor-pointer select-none"
                        >
                          {showAltEmail ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-white hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">Phone</span>
                    <div className="flex-1 flex items-center justify-between gap-2 mt-1 sm:mt-0">
                      {isEditingContact ? (
                        <input
                          type="text"
                          value={contactData.phone}
                          onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                          className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                        />
                      ) : (
                        <span className="text-slate-700 font-medium font-mono">
                          {showPhone ? contactData.phone : "+1-•••-•••-••••"}
                        </span>
                      )}
                      {!isEditingContact && (
                        <button
                          onClick={() => setShowPhone(!showPhone)}
                          className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold hover:underline cursor-pointer select-none"
                        >
                          {showPhone ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alternate Phone */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-[#fcfcfc] hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">Alternate Phone</span>
                    <div className="flex-1 flex items-center justify-between gap-2 mt-1 sm:mt-0">
                      {isEditingContact ? (
                        <input
                          type="text"
                          value={contactData.alternatePhone}
                          onChange={(e) => setContactData({ ...contactData, alternatePhone: e.target.value })}
                          placeholder="Optional alternate phone"
                          className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                        />
                      ) : (
                        <span className="text-slate-500 italic">{contactData.alternatePhone || ""}</span>
                      )}
                      {!isEditingContact && contactData.alternatePhone && (
                        <button
                          onClick={() => setShowAltPhone(!showAltPhone)}
                          className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold hover:underline cursor-pointer select-none"
                        >
                          {showAltPhone ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-white hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">Address</span>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={contactData.address}
                        onChange={(e) => setContactData({ ...contactData, address: e.target.value })}
                        className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                      />
                    ) : (
                      <span className="text-slate-800 font-medium">{contactData.address}</span>
                    )}
                  </div>

                  {/* State */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-[#fcfcfc] hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">State</span>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={contactData.state}
                        onChange={(e) => setContactData({ ...contactData, state: e.target.value })}
                        className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                      />
                    ) : (
                      <span className="text-slate-800 font-medium">{contactData.state}</span>
                    )}
                  </div>

                  {/* City */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-white hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">City</span>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={contactData.city}
                        onChange={(e) => setContactData({ ...contactData, city: e.target.value })}
                        className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                      />
                    ) : (
                      <span className="text-slate-800 font-medium">{contactData.city}</span>
                    )}
                  </div>

                  {/* Postal code */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-[#fcfcfc] hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">Postal code</span>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={contactData.postalCode}
                        onChange={(e) => setContactData({ ...contactData, postalCode: e.target.value })}
                        className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                      />
                    ) : (
                      <span className="text-slate-800 font-medium font-mono">{contactData.postalCode}</span>
                    )}
                  </div>

                  {/* Country */}
                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-white hover:bg-slate-50/50">
                    <span className="w-48 font-bold text-slate-800 shrink-0">Country</span>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={contactData.country}
                        onChange={(e) => setContactData({ ...contactData, country: e.target.value })}
                        className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-xs focus:outline-blue-500"
                      />
                    ) : (
                      <span className="text-slate-800 font-bold">{contactData.country}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FLIGHT INFORMATION                                                 */}
          {/* ========================================================================= */}
          {activeTab === "flight" && (
            <div className="w-full max-w-5xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Flight Information
                  </h2>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Airline Confirmation Number:</span>
                    <strong className="text-blue-700 font-mono font-bold">{confirmationNumber}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload E-Ticket PDF</span>
                  </button>
                </div>
              </div>

              {/* -------------------- DEPART GROUP -------------------- */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Depart
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Confirmation: <strong className="text-blue-700">{confirmationNumber}</strong>
                  </span>
                </div>

                {departFlights.map((flt, idx) => (
                  <React.Fragment key={flt.id || idx}>
                    {/* Route Box */}
                    <div className="border border-slate-200 rounded-md p-4 bg-white shadow-2xs hover:border-slate-300 transition">
                      {/* Segment Route Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold text-slate-700">
                          {flt.routeLabel || `${flt.originName || flt.origin} To ${flt.destinationName || flt.destination}`}
                        </div>
                        {flt.confirmationNumber && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                            Leg Conf: <strong className="text-slate-800">{flt.confirmationNumber}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Airline Logo & Name */}
                        <div className="flex items-center gap-3 min-w-[170px]">
                          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                            {/* American Airlines Eagle Tail Fin SVG */}
                            <svg viewBox="0 0 32 32" className="w-7 h-7">
                              <path d="M4 18 L16 8 L22 14 L12 24 Z" fill="#0078d2" />
                              <path d="M16 8 L28 18 L24 24 L16 16 Z" fill="#c30019" />
                              <circle cx="16" cy="16" r="3" fill="#ffffff" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              {flt.airline || "American Airline"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {flt.flightNumber}
                            </span>
                          </div>
                        </div>

                        {/* Origin Airport */}
                        <div className="text-left min-w-[180px]">
                          <div className="text-xs text-slate-500 font-medium">
                            {flt.departureTime || "06:00 AM"} | {flt.departureDate || "Wed, Jul 16"}
                          </div>
                          <div className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                            {flt.origin}
                          </div>
                          <div className="text-[11px] text-slate-600 leading-snug truncate max-w-[220px]">
                            {flt.originName || "El Paso International Airport"}
                            {flt.departureTerminal && ` (${flt.departureTerminal})`}
                          </div>
                        </div>

                        {/* Flight Duration & Arrow */}
                        <div className="flex flex-col items-center justify-center px-2 min-w-[140px]">
                          <span className="text-[11px] font-semibold text-slate-500 mb-0.5">
                            {flt.duration || "03h 14m"}
                          </span>
                          <div className="w-full flex items-center gap-1">
                            <div className="h-[1.5px] bg-slate-300 flex-1 relative">
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            </div>
                            <Plane className="w-3.5 h-3.5 text-slate-500 shrink-0 rotate-90" />
                            <div className="h-[1.5px] bg-slate-300 flex-1 relative">
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-600 font-medium mt-0.5">
                            {flt.flightNumber} | {flt.cabinClass || "Economy"}
                          </span>
                        </div>

                        {/* Destination Airport */}
                        <div className="text-left min-w-[180px]">
                          <div className="text-xs text-slate-500 font-medium">
                            {flt.arrivalTime || "10:14 AM"} | {flt.arrivalDate || flt.departureDate || "Wed, Jul 16"}
                          </div>
                          <div className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                            {flt.destination}
                          </div>
                          <div className="text-[11px] text-slate-600 leading-snug truncate max-w-[220px]">
                            {flt.destinationName || "O'Hare International Airport"}
                            {flt.arrivalTerminal && ` (${flt.arrivalTerminal})`}
                          </div>
                        </div>

                        {/* Fare Basis Badge Tag */}
                        <div className="text-right shrink-0">
                          <div className="inline-block bg-[#e0f2fe] text-[#0369a1] text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded border border-[#bae6fd]">
                            Fare Basis: <strong className="font-mono">{flt.fareBasis || "GUA0ZNN1"}</strong> | Flight Class: <strong className="font-mono">{flt.flightClass || "G"}</strong> | Fare Type: <strong className="font-mono">{flt.fareType || "SP"}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Layover Banner */}
                    {flt.layoverAfter && (
                      <div className="w-full bg-[#e2e8f0]/80 text-slate-700 text-xs font-semibold py-1.5 px-4 rounded text-center my-1 tracking-wide">
                        Layover : {flt.layoverAfter.duration} in {flt.layoverAfter.city}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* -------------------- RETURN GROUP -------------------- */}
              {returnFlights.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      Return
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      Confirmation: <strong className="text-blue-700">{confirmationNumber}</strong>
                    </span>
                  </div>

                  {returnFlights.map((flt, idx) => (
                    <React.Fragment key={flt.id || idx}>
                      {/* Route Box */}
                      <div className="border border-slate-200 rounded-md p-4 bg-white shadow-2xs hover:border-slate-300 transition">
                        {/* Segment Route Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-bold text-slate-700">
                            {flt.routeLabel || `${flt.originName || flt.origin} To ${flt.destinationName || flt.destination}`}
                          </div>
                          {flt.confirmationNumber && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              Leg Conf: <strong className="text-slate-800">{flt.confirmationNumber}</strong>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Airline Logo & Name */}
                          <div className="flex items-center gap-3 min-w-[170px]">
                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                              <svg viewBox="0 0 32 32" className="w-7 h-7">
                                <path d="M4 18 L16 8 L22 14 L12 24 Z" fill="#0078d2" />
                                <path d="M16 8 L28 18 L24 24 L16 16 Z" fill="#c30019" />
                                <circle cx="16" cy="16" r="3" fill="#ffffff" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block leading-tight">
                                {flt.airline || "American Airline"}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {flt.flightNumber}
                              </span>
                            </div>
                          </div>

                          {/* Origin Airport */}
                          <div className="text-left min-w-[180px]">
                            <div className="text-xs text-slate-500 font-medium">
                              {flt.departureTime || "07:30 PM"} | {flt.departureDate || "Sun, Jul 20"}
                            </div>
                            <div className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                              {flt.origin}
                            </div>
                            <div className="text-[11px] text-slate-600 leading-snug truncate max-w-[220px]">
                              {flt.originName || "Cleveland Hopkins International Airport"}
                            </div>
                          </div>

                          {/* Flight Duration & Arrow */}
                          <div className="flex flex-col items-center justify-center px-2 min-w-[140px]">
                            <span className="text-[11px] font-semibold text-slate-500 mb-0.5">
                              {flt.duration || "02h 59m"}
                            </span>
                            <div className="w-full flex items-center gap-1">
                              <div className="h-[1.5px] bg-slate-300 flex-1 relative">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-400 rounded-full" />
                              </div>
                              <Plane className="w-3.5 h-3.5 text-slate-500 shrink-0 rotate-90" />
                              <div className="h-[1.5px] bg-slate-300 flex-1 relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-400 rounded-full" />
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {flt.flightNumber} | {flt.cabinClass || "Economy"}
                            </span>
                          </div>

                          {/* Destination Airport */}
                          <div className="text-left min-w-[180px]">
                            <div className="text-xs text-slate-500 font-medium">
                              {flt.arrivalTime || "09:29 PM"} | {flt.arrivalDate || flt.departureDate || "Sun, Jul 20"}
                            </div>
                            <div className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                              {flt.destination}
                            </div>
                            <div className="text-[11px] text-slate-600 leading-snug truncate max-w-[220px]">
                              {flt.destinationName || "Dallas/Fort Worth International Airport"}
                            </div>
                          </div>

                          {/* Fare Basis Badge Tag */}
                          <div className="text-right shrink-0">
                            <div className="inline-block bg-[#e0f2fe] text-[#0369a1] text-[10px] sm:text-[11px] font-medium px-2.5 py-1 rounded border border-[#bae6fd]">
                              Fare Basis: <strong className="font-mono">{flt.fareBasis || "VUA0ZNN1"}</strong> | Flight Class: <strong className="font-mono">{flt.flightClass || "V"}</strong> | Fare Type: <strong className="font-mono">{flt.fareType || "SP"}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Layover Banner */}
                      {flt.layoverAfter && (
                        <div className="w-full bg-[#e2e8f0]/80 text-slate-700 text-xs font-semibold py-1.5 px-4 rounded text-center my-1 tracking-wide">
                          Layover : {flt.layoverAfter.duration} in {flt.layoverAfter.city}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PDF DOCUMENTS / E-TICKETS                                          */}
          {/* ========================================================================= */}
          {activeTab === "documents" && (
            <div className="w-full max-w-4xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    PDF Documents & E-Tickets
                  </h2>
                  <p className="text-xs text-slate-500">
                    Attach and preview flight confirmation PDFs, passenger boarding passes, and receipts.
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPdf}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-70"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload New PDF</span>
                </button>
              </div>

              {/* Upload Dropzone / Action Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-6 text-center bg-slate-50/60 hover:bg-blue-50/40 transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Click here to upload flight PDF or E-Ticket
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Supports PDF files up to 25MB (E-Tickets, Invoices, Itinerary confirmation)
                </div>
              </div>

              {/* Attached Files List */}
              <div className="border border-slate-300 rounded overflow-hidden shadow-2xs">
                <div className="bg-[#f1f5f9] px-4 py-2 border-b border-slate-300 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Attached PDF Files ({documents.length})</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Booking Conf #: {confirmationNumber}
                  </span>
                </div>

                {documents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No PDF documents attached yet. Click the upload button above to add a flight confirmation PDF.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3.5 bg-white hover:bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {doc.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{doc.size || "PDF Document"}</span>
                              <span>&bull;</span>
                              <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.dataUrl ? (
                            <button
                              onClick={() => setPreviewPdfDoc(doc)}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1 transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View PDF</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setPreviewPdfDoc(doc)}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded border border-slate-300 flex items-center gap-1 transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                          )}

                          {doc.dataUrl && (
                            <a
                              href={doc.dataUrl}
                              download={doc.name}
                              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          )}

                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-2 py-1 rounded border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                            title="Remove Document"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: PAYMENT / CARD DETAILS                                             */}
          {/* ========================================================================= */}
          {activeTab === "payment" && (
            <div className="w-full max-w-4xl">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 tracking-tight">
                Payment & Card Information
              </h2>

              <div className="border border-slate-300 rounded overflow-hidden shadow-2xs">
                <div className="bg-[#f1f5f9] px-4 py-2 border-b border-slate-300 font-bold text-xs text-slate-800">
                  PCI Card & Billing Summary
                </div>

                <div className="divide-y divide-slate-200 text-xs">
                  <div className="flex px-4 py-2.5 bg-white">
                    <span className="w-48 font-bold text-slate-800">Cardholder Name</span>
                    <span className="text-slate-800 font-medium">
                      {lead?.cardDetails?.cardholderName || lead?.name || "JOSE EMILIO CRUZ"}
                    </span>
                  </div>

                  <div className="flex px-4 py-2.5 bg-[#fcfcfc]">
                    <span className="w-48 font-bold text-slate-800">Card Number</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {lead?.cardDetails?.cardNumber
                        ? `•••• •••• •••• ${lead.cardDetails.cardNumber.slice(-4)}`
                        : "•••• •••• •••• 4444"}
                    </span>
                  </div>

                  <div className="flex px-4 py-2.5 bg-white">
                    <span className="w-48 font-bold text-slate-800">Card Type</span>
                    <span className="font-bold text-blue-700">{lead?.cardDetails?.cardType || "VISA"}</span>
                  </div>

                  <div className="flex px-4 py-2.5 bg-[#fcfcfc]">
                    <span className="w-48 font-bold text-slate-800">Expiry Date</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {lead?.cardDetails?.expiryMonth || "09"}/{lead?.cardDetails?.expiryYear || "2029"}
                    </span>
                  </div>

                  <div className="flex px-4 py-2.5 bg-white">
                    <span className="w-48 font-bold text-slate-800">Flight Confirmation #</span>
                    <span className="font-mono text-blue-700 font-bold">{confirmationNumber}</span>
                  </div>

                  <div className="flex px-4 py-2.5 bg-[#fcfcfc]">
                    <span className="w-48 font-bold text-slate-800">Sale Price</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      ${lead?.salePrice || lead?.dealValue || 1850}.00 USD
                    </span>
                  </div>

                  <div className="flex px-4 py-2.5 bg-white">
                    <span className="w-48 font-bold text-slate-800">Ticket Net Fare</span>
                    <span className="font-medium text-slate-700 font-mono">
                      ${lead?.ticketPrice || 1420}.00 USD
                    </span>
                  </div>

                  <div className="flex px-4 py-2.5 bg-[#fcfcfc]">
                    <span className="w-48 font-bold text-slate-800">Agent MCO Margin</span>
                    <span className="font-bold text-indigo-700 font-mono">
                      ${lead?.mco || 430}.00 USD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PDF DOCUMENT PREVIEW                                               */}
      {/* ========================================================================= */}
      {previewPdfDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm truncate max-w-md">
                  {previewPdfDoc.name}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">({previewPdfDoc.size || "PDF"})</span>
              </div>
              <div className="flex items-center gap-2">
                {previewPdfDoc.dataUrl && (
                  <a
                    href={previewPdfDoc.dataUrl}
                    download={previewPdfDoc.name}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded flex items-center gap-1 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewPdfDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
              {previewPdfDoc.dataUrl ? (
                <iframe
                  src={previewPdfDoc.dataUrl}
                  className="w-full h-full rounded border border-slate-300 bg-white"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-lg border border-slate-300 shadow-sm max-w-md">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{previewPdfDoc.name}</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Sample E-Ticket & Confirmation Document for Confirmation #{confirmationNumber}.
                  </p>
                  <button
                    onClick={() => setPreviewPdfDoc(null)}
                    className="px-4 py-1.5 text-xs bg-blue-600 text-white font-bold rounded shadow-xs"
                  >
                    Close Preview
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / ADD TRAVELLER                                               */}
      {/* ========================================================================= */}
      {(editingPaxIndex !== null || isAddingPax) && editingPaxData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {isAddingPax ? "Add New Traveller" : "Edit Traveller Information"}
              </h3>
              <button
                onClick={() => {
                  setEditingPaxIndex(null);
                  setIsAddingPax(false);
                  setEditingPaxData(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Title</label>
                <select
                  value={editingPaxData.title || "Mr"}
                  onChange={(e) => setEditingPaxData({ ...editingPaxData, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-blue-500 bg-white"
                >
                  <option value="Mr">Mr</option>
                  <option value="Ms">Ms</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Dr">Dr</option>
                  <option value="Master">Master</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Pax Type</label>
                <select
                  value={editingPaxData.type || "Adult"}
                  onChange={(e) => setEditingPaxData({ ...editingPaxData, type: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-blue-500 bg-white"
                >
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                  <option value="Infant">Infant</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-slate-600 font-semibold mb-1">First Name</label>
                <input
                  type="text"
                  value={editingPaxData.firstName || ""}
                  onChange={(e) => setEditingPaxData({ ...editingPaxData, firstName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-blue-500"
                  placeholder="e.g. Jose"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-slate-600 font-semibold mb-1">Middle Name</label>
                <input
                  type="text"
                  value={editingPaxData.middleName || ""}
                  onChange={(e) => setEditingPaxData({ ...editingPaxData, middleName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-blue-500"
                  placeholder="e.g. Emilio"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  value={editingPaxData.lastName || ""}
                  onChange={(e) => setEditingPaxData({ ...editingPaxData, lastName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-blue-500"
                  placeholder="e.g. CruzGomez"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Gender</label>
                <select
                  value={editingPaxData.gender || "Male"}
                  onChange={(e) => setEditingPaxData({ ...editingPaxData, gender: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-blue-500 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date of Birth (MM/DD/YYYY)</label>
                <input
                  type="text"
                  value={editingPaxData.dob || ""}
                  onChange={(e) => setEditingPaxData({ ...editingPaxData, dob: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-blue-500 font-mono"
                  placeholder="10/10/1978"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 border-t border-slate-200 pt-3">
              <button
                onClick={() => {
                  setEditingPaxIndex(null);
                  setIsAddingPax(false);
                  setEditingPaxData(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={isAddingPax ? handleSaveNewPax : handleSavePaxEdit}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs cursor-pointer"
              >
                Save Traveller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND TRAVEL EMAIL MODAL */}
      {isSendMailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Send Travel Mail</h3>
                  <p className="text-[11px] text-purple-200">
                    Dispatch e-ticket, itinerary authorization or price quote with structured HTML flight tables
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSendMailModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {mailSentSuccess ? (
                <div className="py-12 text-center space-y-3">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Email Dispatched Successfully!</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Official travel itinerary email has been sent to <strong>{mailRecipient}</strong> and logged in the digital fingerprint audit trail.
                  </p>
                </div>
              ) : (
                <>
                  {/* Template Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1.5">
                      Select Email Template:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PREDEFINED_EMAIL_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => handleTemplateChange(tmpl.id)}
                          className={`p-2.5 text-left rounded-xl border transition cursor-pointer text-xs ${
                            selectedMailTemplateId === tmpl.id
                              ? "bg-purple-50 border-purple-400 text-purple-950 font-bold shadow-xs ring-1 ring-purple-300"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{tmpl.title}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                              {tmpl.type}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient & Sender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                        To (Recipient Email):
                      </label>
                      <input
                        type="email"
                        value={mailRecipient}
                        onChange={(e) => setMailRecipient(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="passenger@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                        From (Official Sender):
                      </label>
                      <input
                        type="text"
                        disabled
                        value={OFFICIAL_SENDER_EMAIL}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 bg-slate-100"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                      Subject Line:
                    </label>
                    <input
                      type="text"
                      value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Body & Live HTML Table Preview */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                      Email Content Preview (Structured Tables Included):
                    </label>
                    <div
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-72 overflow-y-auto text-xs text-slate-800 space-y-2 font-sans"
                      dangerouslySetInnerHTML={{ __html: mailBody }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!mailSentSuccess && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  All emails include dynamic HTML tables for flights & passengers.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSendMailModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDispatchEmail}
                    disabled={isSendingMail || !mailRecipient.trim()}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSendingMail ? "Sending..." : "Send Email"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
