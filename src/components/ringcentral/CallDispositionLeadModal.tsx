"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneOff,
  PhoneForwarded,
  Mic,
  MicOff,
  Pause,
  Play,
  Grid,
  Hash,
  Check,
  User,
  Mail,
  Plane,
  DollarSign,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Calendar,
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  Save,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { CallLog, User as CrmUser, Lead, CallDisposition, CallSentiment } from "@/types";
import { playCallEndedTone, playMuteTone, playTransferTone, playDtmfTone } from "@/lib/ringcentral";
import { formatCurrency } from "@/lib/utils";

interface CallDispositionLeadModalProps {
  isOpen: boolean;
  activeCall: CallLog | null;
  currentUser: CrmUser;
  onClose: () => void;
  onCallUpdated: (updatedCall: CallLog) => void;
  onLeadCreatedOrUpdated?: () => Promise<void> | void;
}

const DISPOSITION_OPTIONS: { id: CallDisposition; label: string; color: string }[] = [
  { id: "FLIGHT_RESERVATION_SALE", label: "Flight Reservation Sale", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  { id: "BOOKING_INQUIRY", label: "Booking Inquiry", color: "bg-blue-50 text-blue-700 border-blue-300" },
  { id: "PRICE_QUOTE_GIVEN", label: "Price Quote Given", color: "bg-indigo-50 text-indigo-700 border-indigo-300" },
  { id: "PAYMENT_CONFIRMATION", label: "Payment Confirmation", color: "bg-purple-50 text-purple-700 border-purple-300" },
  { id: "ITINERARY_CHANGE", label: "Itinerary / Flight Change", color: "bg-amber-50 text-amber-700 border-amber-300" },
  { id: "FOLLOW_UP_REQUIRED", label: "Follow-up Required", color: "bg-orange-50 text-orange-700 border-orange-300" },
  { id: "LEFT_VOICEMAIL", label: "Left Voicemail", color: "bg-slate-50 text-slate-700 border-slate-300" },
  { id: "NOT_INTERESTED", label: "Not Interested", color: "bg-rose-50 text-rose-700 border-rose-300" },
  { id: "CUSTOMER_BUSY", label: "Customer Busy / Call Back Later", color: "bg-yellow-50 text-yellow-800 border-yellow-300" },
  { id: "WRONG_NUMBER", label: "Wrong Number / Spam", color: "bg-zinc-50 text-zinc-700 border-zinc-300" },
];

export function CallDispositionLeadModal({
  isOpen,
  activeCall,
  currentUser,
  onClose,
  onCallUpdated,
  onLeadCreatedOrUpdated,
}: CallDispositionLeadModalProps) {
  // Call controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // In-call transfer and DTMF keypad states
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [transferTargetExt, setTransferTargetExt] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [inCallDtmfDigits, setInCallDtmfDigits] = useState("");
  const [teamAgents, setTeamAgents] = useState<{ id: string; name: string; rcExtension?: string; role: string }[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"lead_details" | "call_notes">("lead_details");

  // Disposition & Notes
  const [disposition, setDisposition] = useState<CallDisposition>("BOOKING_INQUIRY");
  const [callNotes, setCallNotes] = useState("");
  const [sentiment, setSentiment] = useState<CallSentiment>("POSITIVE");

  // Matched Lead or New Lead creation fields
  const [matchedLead, setMatchedLead] = useState<Lead | null>(null);
  const [isCreatingNewLead, setIsCreatingNewLead] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // New Lead Form Fields
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [origin, setOrigin] = useState("JFK (New York)");
  const [destination, setDestination] = useState("LHR (London)");
  const [tripType, setTripType] = useState<"ROUND_TRIP" | "ONE_WAY">("ROUND_TRIP");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [ticketPrice, setTicketPrice] = useState<number>(850);
  const [salePrice, setSalePrice] = useState<number>(1150);
  const [leadStatus, setLeadStatus] = useState<string>("QUALIFIED");

  // Timer counter for active call
  useEffect(() => {
    if (!activeCall) return;

    if (activeCall.status === "ANSWERED") {
      const startMs = new Date(activeCall.startTime).getTime();
      const interval = setInterval(() => {
        const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setCallDuration(secs);
      }, 1000);
      return () => clearInterval(interval);
    } else if (activeCall.durationSeconds) {
      setCallDuration(activeCall.durationSeconds);
    }
  }, [activeCall]);

  // Load existing data when modal opens or activeCall changes
  useEffect(() => {
    if (!activeCall) return;

    const callerNum = activeCall.direction === "INBOUND" ? activeCall.callerNumber : activeCall.calleeNumber;
    setLeadPhone(callerNum || "");
    if (activeCall.notes) setCallNotes(activeCall.notes);
    if (activeCall.disposition) setDisposition(activeCall.disposition as CallDisposition);
    if (activeCall.sentiment) setSentiment(activeCall.sentiment);

    // Fetch lead details if leadId is linked
    let isCancelled = false;
    const fetchLead = async () => {
      try {
        if (activeCall.leadId) {
          const res = await fetch(`/api/leads/${activeCall.leadId}`);
          const data = await res.json();
          if (!isCancelled && data.success && data.lead) {
            setMatchedLead(data.lead);
            setLeadName(data.lead.name);
            setLeadEmail(data.lead.email);
            if (data.lead.bookingDetails) {
              setOrigin(data.lead.bookingDetails.origin || "JFK (New York)");
              setDestination(data.lead.bookingDetails.destination || "LHR (London)");
              setDepartureDate(data.lead.bookingDetails.departureDate || "");
              setReturnDate(data.lead.bookingDetails.returnDate || "");
              setTicketPrice(data.lead.bookingDetails.ticketPrice || 0);
              setSalePrice(data.lead.bookingDetails.salePrice || 0);
            }
            return;
          }
        }

        // Search if phone number matches an existing lead in CRM
        const cleanCaller = callerNum.replace(/[^0-9]/g, "");
        if (cleanCaller.length >= 7) {
          const res = await fetch("/api/leads");
          const data = await res.json();
          if (!isCancelled && data.success && Array.isArray(data.leads)) {
            const found = data.leads.find((l: Lead) => {
              const lp = (l.phone || "").replace(/[^0-9]/g, "");
              return lp.length >= 7 && (cleanCaller.endsWith(lp) || lp.endsWith(cleanCaller));
            });
            if (found) {
              setMatchedLead(found);
              setLeadName(found.name);
              setLeadEmail(found.email);
              if (found.bookingDetails) {
                setOrigin(found.bookingDetails.origin || "JFK (New York)");
                setDestination(found.bookingDetails.destination || "LHR (London)");
                setDepartureDate(found.bookingDetails.departureDate || "");
                setReturnDate(found.bookingDetails.returnDate || "");
              }
              return;
            }
          }
        }

        // Not matched: prepare new lead form
        if (!isCancelled) {
          setMatchedLead(null);
          setIsCreatingNewLead(true);
        }
      } catch (err) {
        console.warn("Failed to load lead match:", err);
      }
    };

    fetchLead();
    return () => {
      isCancelled = true;
    };
  }, [activeCall]);

  if (!isOpen || !activeCall) return null;

  const isCallActive = activeCall.status === "ANSWERED" || activeCall.status === "RINGING";
  const mcoProfit = Math.max(0, (salePrice || 0) - (ticketPrice || 0));

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const fetchTeamAgents = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setTeamAgents(
          data.users.filter((u: CrmUser) => u.id !== currentUser.id && u.rcExtension)
        );
      }
    } catch {
      setTeamAgents([
        { id: "usr_dir_alex", name: "Alex Thorne", rcExtension: "100", role: "SALES_DIRECTOR" },
        { id: "usr_sales_agent2", name: "Marcus Brooks", rcExtension: "102", role: "SENIOR_AGENT" },
        { id: "usr_sales_agent3", name: "Rachel Vance", rcExtension: "103", role: "TIER1_AGENT" },
        { id: "usr_sales_agent4", name: "David Miller", rcExtension: "104", role: "CORPORATE_AGENT" },
        { id: "usr_ticketing_specialist", name: "Elena Rostova", rcExtension: "105", role: "TICKETING" },
      ]);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    playMuteTone(next);
  };

  const handleInCallKeyPress = (digit: string) => {
    playDtmfTone(digit);
    setInCallDtmfDigits((prev) => prev + digit);
  };

  const handleTransferCall = async () => {
    if (!activeCall || !transferTargetExt.trim() || isTransferring) return;
    setIsTransferring(true);
    try {
      playTransferTone();
      const res = await fetch("/api/ringcentral/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: activeCall.id,
          targetExtension: transferTargetExt.trim(),
          fromAgentId: currentUser.id,
          transferNotes: transferNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.call) {
        onCallUpdated(data.call);
        setShowTransferPanel(false);
        setTransferTargetExt("");
        setTransferNotes("");
        alert(`Call successfully transferred to Extension ${transferTargetExt.trim()}`);
      } else {
        alert(data.error || "Transfer failed");
      }
    } catch (err) {
      console.error("Transfer failed:", err);
      alert("Transfer failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsTransferring(false);
    }
  };

  // Hangup call
  const handleHangup = async () => {
    try {
      playCallEndedTone();
      const res = await fetch(`/api/ringcentral/calls/${activeCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          endTime: new Date().toISOString(),
          durationSeconds: callDuration,
          telephonyStatus: "Disconnected",
        }),
      });
      const data = await res.json();
      if (data.success && data.call) {
        onCallUpdated(data.call);
      }
    } catch (err) {
      console.error("Hangup failed:", err);
    }
  };

  // Save Lead and Call Details
  const handleSaveAll = async () => {
    if (!activeCall) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      let finalLeadId = matchedLead?.id;
      let finalBookingNumber = matchedLead?.bookingNumber;

      // 1. If creating a brand new lead, ingest into CRM
      if (!matchedLead && leadName.trim()) {
        const leadPayload = {
          actorId: currentUser.id,
          name: leadName.trim(),
          phone: leadPhone.trim(),
          email: leadEmail.trim() || `${leadName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`,
          status: leadStatus,
          dealValue: salePrice || ticketPrice || 1000,
          ticketPrice: ticketPrice || 0,
          salePrice: salePrice || 0,
          mco: mcoProfit,
          assignedToId: currentUser.id,
          assignedToName: currentUser.name,
          bookingDetails: {
            origin: origin.trim(),
            destination: destination.trim(),
            tripType,
            departureDate: departureDate || new Date().toISOString().split("T")[0],
            returnDate: tripType === "ROUND_TRIP" ? returnDate : undefined,
            airline: "American Airlines",
            flightNumber: "AA-" + Math.floor(100 + Math.random() * 900),
            cabinClass: "ECONOMY",
            passengers: [
              {
                id: "pax_1",
                fullName: leadName.trim(),
                dob: "1990-01-01",
                type: "ADULT",
              },
            ],
            ticketPrice,
            salePrice,
            mco: mcoProfit,
          },
          notes: `[RingCentral Ext ${currentUser.rcExtension || activeCall.agentExtension}] Inbound Call Lead: ${callNotes}`,
        };

        const leadRes = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(leadPayload),
        });

        const leadData = await leadRes.json();
        if (leadData.success && leadData.lead) {
          finalLeadId = leadData.lead.id;
          finalBookingNumber = leadData.lead.bookingNumber;
          setMatchedLead(leadData.lead);
          if (onLeadCreatedOrUpdated) {
            await onLeadCreatedOrUpdated();
          }
        }
      } else if (matchedLead) {
        // Update existing lead status or pricing
        await fetch(`/api/leads/${matchedLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorId: currentUser.id,
            status: leadStatus,
            salePrice: salePrice || matchedLead.salePrice,
            ticketPrice: ticketPrice || matchedLead.ticketPrice,
            mco: mcoProfit,
          }),
        });
        if (onLeadCreatedOrUpdated) {
          await onLeadCreatedOrUpdated();
        }
      }

      // 2. Update CallLog with disposition, notes, sentiment, and linked lead
      const callPatchRes = await fetch(`/api/ringcentral/calls/${activeCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disposition,
          notes: callNotes.trim(),
          sentiment,
          leadId: finalLeadId,
          leadBookingNumber: finalBookingNumber,
          leadDetailsEntered: true,
          durationSeconds: callDuration,
        }),
      });

      const callData = await callPatchRes.json();
      if (callData.success && callData.call) {
        onCallUpdated(callData.call);
        setSaveSuccessMsg("Lead & Call Log details saved under Extension " + (currentUser.rcExtension || activeCall.agentExtension));
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Save call details failed:", err);
      alert("Failed to save details: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header: In-call Telephony Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
              <Phone className={`h-6 w-6 ${isCallActive ? "text-emerald-400 animate-pulse" : "text-slate-300"}`} />
              {isCallActive && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isCallActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-700 text-slate-300"
                }`}>
                  {isCallActive ? "Live Call Connected" : "Call Completed"}
                </span>
                <span className="text-xs font-mono font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-md">
                  Agent Ext {currentUser.rcExtension || activeCall.agentExtension}
                </span>
              </div>
              <h3 className="text-lg font-bold font-mono tracking-tight text-white mt-0.5">
                {activeCall.direction === "INBOUND" ? activeCall.callerNumber : activeCall.calleeNumber}
                <span className="text-xs font-normal text-slate-400 ml-2">
                  ({activeCall.direction === "INBOUND" ? "Inbound from Customer" : "Outbound to Client"})
                </span>
              </h3>
            </div>
          </div>

          {/* Live Timer & In-Call Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl font-mono text-sm font-bold text-emerald-300 shadow-inner">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>{formatTimer(callDuration)}</span>
            </div>

            {isCallActive && (
              <>
                {/* 1. MUTE / UNMUTE */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isMuted ? "bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-bold" : "bg-white/10 hover:bg-white/20 text-slate-200"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isMuted ? "Muted" : "Mute"}</span>
                </button>

                {/* 2. TRANSFER TO EXTENSION */}
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferPanel(!showTransferPanel);
                    setShowInCallKeypad(false);
                    fetchTeamAgents();
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    showTransferPanel ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400" : "bg-white/10 hover:bg-white/20 text-slate-200"
                  }`}
                  title="Transfer Call to Another Extension"
                >
                  <PhoneForwarded className="h-4 w-4" />
                  <span className="hidden sm:inline">Transfer</span>
                </button>

                {/* 3. DIAL NUMBER / DTMF KEYPAD */}
                <button
                  type="button"
                  onClick={() => {
                    setShowInCallKeypad(!showInCallKeypad);
                    setShowTransferPanel(false);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    showInCallKeypad ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400" : "bg-white/10 hover:bg-white/20 text-slate-200"
                  }`}
                  title="In-Call DTMF Dialpad"
                >
                  <Grid className="h-4 w-4" />
                  <span className="hidden sm:inline">Keypad</span>
                </button>

                {/* 4. END CALL */}
                <button
                  type="button"
                  onClick={handleHangup}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-rose-900/40 active:scale-95"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>End Call</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* In-Call Transfer Extension Drawer (collapsible) */}
        {showTransferPanel && isCallActive && (
          <div className="bg-slate-900 border-b border-indigo-500/40 px-6 py-3 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <PhoneForwarded className="h-4 w-4" />
                <span>Transfer Call to Ext:</span>
              </div>
              <input
                type="text"
                value={transferTargetExt}
                onChange={(e) => setTransferTargetExt(e.target.value)}
                placeholder="Extension (e.g. 102)"
                className="w-28 text-xs font-mono font-bold bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Reason / Notes..."
                className="w-48 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 mr-1">Quick Select:</span>
              {teamAgents.map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => setTransferTargetExt(ag.rcExtension || "")}
                  className={`text-[10px] px-2 py-1 rounded-md border font-mono transition-colors ${
                    transferTargetExt === ag.rcExtension
                      ? "bg-indigo-600 border-indigo-400 text-white font-bold"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {ag.name.split(" ")[0]} ({ag.rcExtension})
                </button>
              ))}

              <button
                type="button"
                disabled={!transferTargetExt.trim() || isTransferring}
                onClick={handleTransferCall}
                className="ml-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
              >
                <PhoneForwarded className="h-3 w-3" />
                <span>{isTransferring ? "Transferring..." : "Confirm Transfer"}</span>
              </button>
            </div>
          </div>
        )}

        {/* In-Call DTMF Dialpad Drawer (collapsible) */}
        {showInCallKeypad && isCallActive && (
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 text-white flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Hash className="h-4 w-4 text-indigo-400" />
                In-Call Dialpad:
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 font-mono text-sm font-bold text-emerald-400 tracking-wider min-w-[120px] text-center">
                {inCallDtmfDigits || <span className="text-slate-500 text-xs">Touch Tones</span>}
              </div>
              {inCallDtmfDigits && (
                <button
                  onClick={() => setInCallDtmfDigits("")}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleInCallKeyPress(d)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center transition-all active:scale-95"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("lead_details")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "lead_details"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>1. Customer & Lead Details</span>
              {matchedLead && (
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md font-mono text-[10px]">
                  #{matchedLead.bookingNumber}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("call_notes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "call_notes"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>2. Call Disposition & Notes</span>
              {activeCall.leadDetailsEntered && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Assigned to Ext {currentUser.rcExtension || activeCall.agentExtension} ({currentUser.name})</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {activeTab === "lead_details" ? (
            <div className="space-y-6">
              {matchedLead ? (
                /* MATCHED EXISTING LEAD VIEW */
                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-indigo-950">
                        Existing CRM Lead Matched by Caller Number
                      </h4>
                      <span className="bg-indigo-600 text-white font-mono text-xs font-bold px-2 py-0.5 rounded-md">
                        Booking #{matchedLead.bookingNumber}
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Status: {matchedLead.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <span className="text-slate-500 font-medium">Passenger Name</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{matchedLead.name}</p>
                      <p className="text-slate-500 font-mono mt-0.5">{matchedLead.phone}</p>
                      <p className="text-slate-500 truncate mt-0.5">{matchedLead.email}</p>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <span className="text-slate-500 font-medium">Flight Itinerary</span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {matchedLead.bookingDetails?.origin || "JFK"} → {matchedLead.bookingDetails?.destination || "LHR"}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Depart: {matchedLead.bookingDetails?.departureDate || "N/A"}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Airline: {matchedLead.bookingDetails?.airline || "American Airlines"}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <span className="text-slate-500 font-medium">Fare & Profit</span>
                      <p className="font-bold text-emerald-600 text-sm mt-0.5">
                        Gross Sold: {formatCurrency(matchedLead.salePrice || matchedLead.dealValue || 0)}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Net Cost: {formatCurrency(matchedLead.ticketPrice || 0)}
                      </p>
                      <p className="text-indigo-600 font-semibold mt-0.5">
                        Agent MCO: {formatCurrency(matchedLead.mco || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* LEAD ENTRY / UPDATE FORM */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>{matchedLead ? "Update Lead & Booking Details" : "Enter New Lead Information from Call"}</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-semibold">Lead Status:</label>
                    <select
                      value={leadStatus}
                      onChange={(e) => setLeadStatus(e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-indigo-500"
                    >
                      <option value="NEW">NEW</option>
                      <option value="FOLLOW_UP">FOLLOW_UP</option>
                      <option value="QUALIFIED">QUALIFIED</option>
                      <option value="SALE">SALE</option>
                      <option value="TICKETING">TICKETING</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. Robert Martinez"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number (Caller ID)
                    </label>
                    <input
                      type="text"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Flight & Travel Details */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Plane className="h-3.5 w-3.5 text-indigo-600" /> Flight Itinerary Details Requested by Caller
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Origin City/Airport</label>
                      <input
                        type="text"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="JFK (New York)"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Destination City/Airport</label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="LHR (London)"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Departure Date</label>
                      <input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trip Type</label>
                      <select
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value as "ROUND_TRIP" | "ONE_WAY")}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500 bg-white"
                      >
                        <option value="ROUND_TRIP">Round Trip</option>
                        <option value="ONE_WAY">One Way</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quoted Pricing & MCO Calculation */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Fare Quote & Profit (MCO)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Net Ticket Cost ($)
                      </label>
                      <input
                        type="number"
                        value={ticketPrice}
                        onChange={(e) => setTicketPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Gross Sale Price Quoted to Caller ($)
                      </label>
                      <input
                        type="number"
                        value={salePrice}
                        onChange={(e) => setSalePrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-700 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      />
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex flex-col justify-center">
                      <span className="text-[11px] text-emerald-700 font-semibold">Agent MCO Margin</span>
                      <span className="text-base font-bold text-emerald-700 font-mono">
                        ${mcoProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: CALL DISPOSITION & NOTES */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Select Call Disposition / Outcome <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {DISPOSITION_OPTIONS.map((opt) => {
                    const isSelected = disposition === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDisposition(opt.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/30 font-bold"
                            : `${opt.color} hover:opacity-90 font-medium`
                        }`}
                      >
                        <p className="text-xs leading-snug">{opt.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Sentiment */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Customer Sentiment
                </label>
                <div className="flex items-center gap-3">
                  {(["POSITIVE", "NEUTRAL", "URGENT", "FRUSTRATED"] as CallSentiment[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSentiment(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        sentiment === st
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {st === "POSITIVE" && "😊 Positive / Ready to Book"}
                      {st === "NEUTRAL" && "😐 Neutral / Inquiry"}
                      {st === "URGENT" && "⚡ Urgent Travel"}
                      {st === "FRUSTRATED" && "⚠️ Frustrated / Escalation"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Summary & Discussion Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Call Discussion Notes & Agent Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Enter detailed summary of conversation, client preferences, passport status, next steps agreed upon..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Calls recorded & stored on <strong className="text-slate-800">Ext {currentUser.rcExtension || activeCall.agentExtension}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Lead & Call Details</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
