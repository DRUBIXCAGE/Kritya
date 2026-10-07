"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneOff,
  PhoneForwarded,
  Mic,
  MicOff,
  Grid,
  Hash,
  Clock,
  CheckCircle2,
  X,
  Save,
  User,
  Plane,
  DollarSign,
  FileText,
  Sparkles,
} from "lucide-react";
import { CallLog, User as CrmUser, Lead, CallDisposition } from "@/types";
import {
  playCallEndedTone,
  playMuteTone,
  playTransferTone,
  playDtmfTone,
} from "@/lib/ringcentral";

interface CallDispositionLeadModalProps {
  isOpen: boolean;
  activeCall: CallLog | null;
  currentUser: CrmUser;
  onClose: () => void;
  onCallUpdated: (updatedCall: CallLog) => void;
  onLeadCreatedOrUpdated?: () => Promise<void> | void;
}

const COMMON_DISPOSITIONS: { id: CallDisposition; label: string }[] = [
  { id: "FLIGHT_RESERVATION_SALE", label: "Flight Reservation Sale" },
  { id: "BOOKING_INQUIRY", label: "Booking Inquiry" },
  { id: "PRICE_QUOTE_GIVEN", label: "Price Quote Given" },
  { id: "FOLLOW_UP_REQUIRED", label: "Follow-up Required" },
  { id: "PAYMENT_CONFIRMATION", label: "Payment Confirmation" },
  { id: "ITINERARY_CHANGE", label: "Flight Change" },
  { id: "LEFT_VOICEMAIL", label: "Left Voicemail" },
  { id: "CUSTOMER_BUSY", label: "Call Back Later" },
  { id: "NOT_INTERESTED", label: "Not Interested" },
  { id: "WRONG_NUMBER", label: "Wrong Number / Spam" },
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
  const [callDuration, setCallDuration] = useState(0);

  // In-call drawers
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [transferTargetExt, setTransferTargetExt] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [inCallDtmfDigits, setInCallDtmfDigits] = useState("");
  const [teamAgents, setTeamAgents] = useState<{ id: string; name: string; rcExtension?: string }[]>([]);

  // Simplified form fields
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [route, setRoute] = useState("JFK → LHR");
  const [ticketPrice, setTicketPrice] = useState<number>(850);
  const [salePrice, setSalePrice] = useState<number>(1150);
  const [disposition, setDisposition] = useState<CallDisposition>("BOOKING_INQUIRY");
  const [callNotes, setCallNotes] = useState("");
  const [leadStatus, setLeadStatus] = useState<string>("QUALIFIED");

  const [matchedLead, setMatchedLead] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const isCallActive = activeCall?.status === "ANSWERED" || activeCall?.status === "RINGING";
  const mcoProfit = Math.max(0, (salePrice || 0) - (ticketPrice || 0));

  // Live timer
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

  // Load team agents
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
        { id: "usr_dir_alex", name: "Alex Thorne", rcExtension: "100" },
        { id: "usr_sales_agent2", name: "Marcus Brooks", rcExtension: "102" },
        { id: "usr_sales_agent3", name: "Rachel Vance", rcExtension: "103" },
        { id: "usr_sales_agent4", name: "David Miller", rcExtension: "104" },
      ]);
    }
  };

  // Load caller info and search CRM match
  useEffect(() => {
    if (!activeCall) return;

    const callerNum = activeCall.direction === "INBOUND" ? activeCall.callerNumber : activeCall.calleeNumber;
    setLeadPhone(callerNum || "");
    if (activeCall.notes) setCallNotes(activeCall.notes);
    if (activeCall.disposition) setDisposition(activeCall.disposition as CallDisposition);

    let isCancelled = false;
    const fetchLeadMatch = async () => {
      try {
        if (activeCall.leadId) {
          const res = await fetch(`/api/leads/${activeCall.leadId}`);
          const data = await res.json();
          if (!isCancelled && data.success && data.lead) {
            setMatchedLead(data.lead);
            setLeadName(data.lead.name);
            setLeadEmail(data.lead.email);
            if (data.lead.bookingDetails) {
              setRoute(`${data.lead.bookingDetails.origin || "JFK"} → ${data.lead.bookingDetails.destination || "LHR"}`);
              setTicketPrice(data.lead.bookingDetails.ticketPrice || 850);
              setSalePrice(data.lead.bookingDetails.salePrice || 1150);
            }
            return;
          }
        }

        // Search CRM by phone number
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
                setRoute(`${found.bookingDetails.origin || "JFK"} → ${found.bookingDetails.destination || "LHR"}`);
                setTicketPrice(found.bookingDetails.ticketPrice || 850);
                setSalePrice(found.bookingDetails.salePrice || 1150);
              }
              return;
            }
          }
        }

        // New lead default
        if (!isCancelled) {
          setMatchedLead(null);
          setLeadName("");
        }
      } catch (err) {
        console.warn("Failed to match lead:", err);
      }
    };

    fetchLeadMatch();
    return () => {
      isCancelled = true;
    };
  }, [activeCall]);

  if (!isOpen || !activeCall) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
        alert(`Call transferred to Extension ${transferTargetExt.trim()}`);
      } else {
        alert(data.error || "Transfer failed");
      }
    } catch (err) {
      console.error("Transfer failed:", err);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSaveDetails = async (closeAfterSave = false) => {
    if (!activeCall) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      let finalLeadId = matchedLead?.id;
      let finalBookingNumber = matchedLead?.bookingNumber;

      // 1. Create lead if new customer
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
            origin: route.split("→")[0]?.trim() || "JFK",
            destination: route.split("→")[1]?.trim() || "LHR",
            tripType: "ROUND_TRIP",
            departureDate: new Date().toISOString().split("T")[0],
            airline: "American Airlines",
            ticketPrice,
            salePrice,
            mco: mcoProfit,
          },
          notes: `[RingCentral Ext ${currentUser.rcExtension || activeCall.agentExtension}]: ${callNotes}`,
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
        // Update existing lead pricing & status
        await fetch(`/api/leads/${matchedLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salePrice,
            mco: mcoProfit,
            dealValue: salePrice,
            status: leadStatus,
            notes: `${matchedLead.notes || ""}\n[Call Note]: ${callNotes}`,
          }),
        });
        if (onLeadCreatedOrUpdated) {
          await onLeadCreatedOrUpdated();
        }
      }

      // 2. Update Call Log with disposition & notes
      const callRes = await fetch(`/api/ringcentral/calls/${activeCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disposition,
          notes: callNotes.trim(),
          durationSeconds: callDuration,
          leadId: finalLeadId,
          leadBookingNumber: finalBookingNumber,
          leadDetailsEntered: true,
        }),
      });

      const callData = await callRes.json();
      if (callData.success && callData.call) {
        onCallUpdated(callData.call);
      }

      setSaveSuccessMsg("Call details & lead saved successfully!");
      if (closeAfterSave) {
        setTimeout(() => onClose(), 800);
      } else {
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error("Save details failed:", err);
      alert("Failed to save: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Sleek Minimal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {isCallActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCallActive ? "bg-emerald-500" : "bg-slate-400"}`} />
              </span>
              <span className="text-xs font-bold text-slate-300">
                {isCallActive ? "Live Call" : "Completed"}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            <div className="font-mono text-xs font-bold text-white">
              {activeCall.direction === "INBOUND" ? activeCall.callerNumber : activeCall.calleeNumber}
            </div>

            <div className="font-mono text-xs text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTimer(callDuration)}</span>
            </div>
          </div>

          {/* Quick In-Call Action Icons */}
          <div className="flex items-center gap-1.5">
            {isCallActive && (
              <>
                {/* Mute */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isMuted ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>

                {/* Keypad */}
                <button
                  type="button"
                  onClick={() => {
                    setShowInCallKeypad(!showInCallKeypad);
                    setShowTransferPanel(false);
                  }}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showInCallKeypad ? "bg-indigo-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                  title="DTMF Keypad"
                >
                  <Grid className="h-3.5 w-3.5" />
                </button>

                {/* Transfer */}
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferPanel(!showTransferPanel);
                    setShowInCallKeypad(false);
                    fetchTeamAgents();
                  }}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showTransferPanel ? "bg-indigo-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                  title="Transfer Call"
                >
                  <PhoneForwarded className="h-3.5 w-3.5" />
                </button>

                {/* Hang Up */}
                <button
                  type="button"
                  onClick={handleHangup}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                  title="End Call"
                >
                  <PhoneOff className="h-3 w-3" />
                  <span>End</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Quick Transfer Bar */}
        {showTransferPanel && isCallActive && (
          <div className="bg-slate-800 px-5 py-2.5 text-white flex items-center justify-between gap-3 text-xs border-b border-slate-700 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-indigo-300 flex items-center gap-1">
                <PhoneForwarded className="h-3.5 w-3.5" /> Transfer to Ext:
              </span>
              <input
                type="text"
                value={transferTargetExt}
                onChange={(e) => setTransferTargetExt(e.target.value)}
                placeholder="Ext (e.g. 102)"
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-bold text-white focus:outline-hidden"
              />
              <div className="flex gap-1">
                {teamAgents.map((ag) => (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() => setTransferTargetExt(ag.rcExtension || "")}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-600 text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
                  >
                    {ag.name.split(" ")[0]} ({ag.rcExtension})
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!transferTargetExt.trim() || isTransferring}
              onClick={handleTransferCall}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded text-xs transition-colors"
            >
              {isTransferring ? "Transferring..." : "Confirm"}
            </button>
          </div>
        )}

        {/* Collapsible Quick In-Call DTMF Keypad */}
        {showInCallKeypad && isCallActive && (
          <div className="bg-slate-800 px-5 py-2 text-white flex items-center justify-between text-xs border-b border-slate-700 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">Digits: {inCallDtmfDigits || "-"}</span>
              {inCallDtmfDigits && (
                <button onClick={() => setInCallDtmfDigits("")} className="text-slate-400 hover:text-white text-[10px]">
                  Clear
                </button>
              )}
            </div>

            <div className="flex gap-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleInCallKeyPress(d)}
                  className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition-colors"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Simplified, Clean Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {saveSuccessMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Matched Lead Notice (if matched) */}
          {matchedLead && (
            <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 font-medium">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Existing Customer Linked: <strong>{matchedLead.name}</strong></span>
                <span className="bg-indigo-200/70 text-indigo-900 font-mono text-[10px] px-1.5 py-0.2 rounded">
                  #{matchedLead.bookingNumber}
                </span>
              </div>
              <span className="text-[11px] text-indigo-700 font-semibold">
                Status: {matchedLead.status}
              </span>
            </div>
          )}

          {/* 1. Caller & Lead Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. John Miller"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="w-full text-xs font-mono font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Flight Route / Subject
              </label>
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="e.g. JFK → LHR"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 2. Pricing & Agent MCO Margin */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-3 items-center text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Ticket Net Fare ($)
              </label>
              <input
                type="number"
                value={ticketPrice || ""}
                onChange={(e) => setTicketPrice(parseFloat(e.target.value) || 0)}
                className="w-full font-mono font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Sale Price ($)
              </label>
              <input
                type="number"
                value={salePrice || ""}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                className="w-full font-mono font-bold text-indigo-700 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Agent MCO (Profit)
              </span>
              <div className="font-mono text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-center">
                +${mcoProfit.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 3. Call Disposition & Outcome */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Call Disposition <span className="text-rose-500">*</span>
                </label>
                <select
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value as CallDisposition)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {COMMON_DISPOSITIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Lead Pipeline Stage
                </label>
                <select
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="NEW">New Lead</option>
                  <option value="QUALIFIED">Qualified / In Negotiation</option>
                  <option value="FOLLOW_UP">Follow-Up Required</option>
                  <option value="SALE">Closed Sale</option>
                  <option value="TICKETING">Sent to Ticketing Desk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Call Remarks & Discussion Notes
              </label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Enter client inquiries, flight dates, fare quotes, or agreed next steps..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              />
            </div>
          </div>
        </div>

        {/* Clean Action Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Agent: {currentUser.name} (Ext {currentUser.rcExtension || "101"})
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Dismiss
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveDetails(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving..." : "Save Details & Finish"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
