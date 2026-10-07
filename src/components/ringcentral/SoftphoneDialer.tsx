"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Delete,
  Clock,
  User as UserIcon,
  History,
  Grid,
  Minimize2,
  Sparkles,
  Mic,
  MicOff,
  Pause,
  Play,
  FileText,
  Users,
  Check,
  ChevronRight,
  Hash,
} from "lucide-react";
import { User as CrmUser, CallLog } from "@/types";
import {
  playDtmfTone,
  playCallEndedTone,
  playCallConnectedTone,
  playMuteTone,
  playTransferTone,
} from "@/lib/ringcentral";

interface SoftphoneDialerProps {
  currentUser: CrmUser;
  activeCall: CallLog | null;
  onCallInitiated: (call: CallLog) => void;
  onCallUpdated: (call: CallLog) => void;
  onOpenDispositionModal: () => void;
}

const KEYPAD_KEYS = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
];

export function SoftphoneDialer({
  currentUser,
  activeCall,
  onCallInitiated,
  onCallUpdated,
  onOpenDispositionModal,
}: SoftphoneDialerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dialer" | "recent">("dialer");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isDialing, setIsDialing] = useState(false);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);

  // In-call controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [inCallDtmfDigits, setInCallDtmfDigits] = useState("");
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [transferTargetExt, setTransferTargetExt] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Team agents for transfer
  const [teamAgents, setTeamAgents] = useState<{ id: string; name: string; rcExtension?: string; role: string }[]>([]);

  // Agent availability status
  const [status, setStatus] = useState<"AVAILABLE" | "BUSY" | "ON_CALL" | "OFFLINE">(
    currentUser.rcStatus || "AVAILABLE"
  );

  const isCallActive = Boolean(
    activeCall && (activeCall.status === "ANSWERED" || activeCall.status === "RINGING")
  );

  // Sync status with active call
  useEffect(() => {
    if (isCallActive) {
      setStatus("ON_CALL");
    } else {
      setStatus(currentUser.rcStatus || "AVAILABLE");
      setIsMuted(false);
      setIsOnHold(false);
      setShowInCallKeypad(false);
      setShowTransferPanel(false);
      setInCallDtmfDigits("");
    }
  }, [isCallActive, currentUser.rcStatus]);

  // Live timer for active call
  useEffect(() => {
    if (!activeCall || activeCall.status !== "ANSWERED") {
      setCallDuration(0);
      return;
    }

    const startMs = new Date(activeCall.startTime).getTime();
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setCallDuration(secs);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall]);

  // Fetch recent calls and team agents when softphone opens
  const fetchRecentCalls = async () => {
    try {
      const ext = currentUser.rcExtension || "101";
      const res = await fetch(`/api/ringcentral/calls?extension=${ext}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.callLogs)) {
        setRecentCalls(data.callLogs.slice(0, 10));
      }
    } catch (err) {
      console.warn("Failed to fetch recent calls:", err);
    }
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
      // Fallback agents
      setTeamAgents([
        { id: "usr_dir_alex", name: "Alex Thorne", rcExtension: "100", role: "SALES_DIRECTOR" },
        { id: "usr_sales_agent2", name: "Marcus Brooks", rcExtension: "102", role: "SENIOR_AGENT" },
        { id: "usr_sales_agent3", name: "Rachel Vance", rcExtension: "103", role: "TIER1_AGENT" },
        { id: "usr_sales_agent4", name: "David Miller", rcExtension: "104", role: "CORPORATE_AGENT" },
        { id: "usr_ticketing_specialist", name: "Elena Rostova", rcExtension: "105", role: "TICKETING" },
      ]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentCalls();
      fetchTeamAgents();
    }
  }, [isOpen]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleKeyPress = (digit: string) => {
    playDtmfTone(digit);
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  // In-call DTMF Keypress
  const handleInCallKeyPress = (digit: string) => {
    playDtmfTone(digit);
    setInCallDtmfDigits((prev) => prev + digit);
  };

  // Mute toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playMuteTone(nextMuted);
  };

  // Hold toggle
  const handleToggleHold = () => {
    setIsOnHold(!isOnHold);
  };

  // End / Hangup call
  const handleEndCall = async () => {
    if (!activeCall) return;
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
      setShowTransferPanel(false);
      setShowInCallKeypad(false);
    } catch (err) {
      console.error("End call failed:", err);
    }
  };

  // Transfer Call to Another Extension
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
      alert("Transfer failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setIsTransferring(false);
    }
  };

  // Initiate Outbound Call
  const handleDial = async () => {
    if (!phoneNumber.trim() || isDialing) return;
    setIsDialing(true);

    try {
      const res = await fetch("/api/ringcentral/dial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: currentUser.id,
          targetNumber: phoneNumber.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.call) {
        onCallInitiated(data.call);
        // Automatically answer after short ring in demo simulation
        setTimeout(async () => {
          try {
            playCallConnectedTone();
            const ansRes = await fetch(`/api/ringcentral/calls/${data.call.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "ANSWERED",
                telephonyStatus: "Connected",
              }),
            });
            const ansData = await ansRes.json();
            if (ansData.success && ansData.call) {
              onCallUpdated(ansData.call);
              onOpenDispositionModal();
            }
          } catch {}
        }, 1200);
      } else {
        alert(data.error || "Dial failed");
      }
    } catch (err) {
      console.error("Dial failed:", err);
    } finally {
      setIsDialing(false);
    }
  };

  // Quick Test Simulation for Inbound Call
  const handleSimulateInboundCall = async () => {
    try {
      const ext = currentUser.rcExtension || "101";
      const res = await fetch("/api/ringcentral/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INCOMING_CALL",
          extension: ext,
          callerNumber: "+1 (555) 234-8910",
          callerName: "Robert Davis",
        }),
      });
      const data = await res.json();
      if (data.success && data.call) {
        onCallInitiated(data.call);
      }
    } catch (err) {
      console.error("Simulate incoming failed:", err);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatus: "AVAILABLE" | "BUSY" | "OFFLINE") => {
    setStatus(newStatus);
    try {
      await fetch("/api/ringcentral/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          status: newStatus,
        }),
      });
    } catch (err) {
      console.warn("Status change failed:", err);
    }
  };

  return (
    <>
      {/* Floating Launcher Button (Bottom Right) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => {
              setIsOpen(true);
              fetchTeamAgents();
            }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-white font-semibold text-xs transition-all active:scale-95 group ${
              isCallActive
                ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-500 shadow-emerald-600/30 ring-4 ring-emerald-500/20"
                : "bg-slate-900 hover:bg-slate-800 border-slate-700 shadow-slate-900/30"
            }`}
          >
            <div className="relative">
              <Phone className={`h-4 w-4 ${isCallActive ? "animate-bounce" : ""}`} />
              <span
                className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900 ${
                  status === "AVAILABLE"
                    ? "bg-emerald-500"
                    : status === "ON_CALL"
                    ? "bg-emerald-400 animate-pulse"
                    : status === "BUSY"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
              />
            </div>

            <div className="text-left">
              <p className="font-bold leading-tight">
                {isCallActive ? `In Call (${formatTimer(callDuration)})` : "RingCentral Phone"}
              </p>
              <p className="text-[10px] text-slate-300 font-mono">
                Ext {currentUser.rcExtension || "101"} • {status}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Expanded Softphone Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-40 w-88 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
                <Phone className={`h-4 w-4 ${isCallActive ? "text-emerald-400 animate-pulse" : "text-indigo-300"}`} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs leading-none">RingCentral Phone</h4>
                  <span className="font-mono text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded">
                    Ext {currentUser.rcExtension || "101"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Status Selector */}
              <select
                value={status === "ON_CALL" ? "ON_CALL" : status}
                onChange={(e) => handleStatusChange(e.target.value as "AVAILABLE" | "BUSY" | "OFFLINE")}
                disabled={status === "ON_CALL"}
                className="text-[11px] font-semibold bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 focus:outline-hidden"
              >
                <option value="AVAILABLE" className="bg-slate-900 text-white">🟢 Available</option>
                <option value="BUSY" className="bg-slate-900 text-white">🟡 Busy</option>
                {status === "ON_CALL" && (
                  <option value="ON_CALL" className="bg-slate-900 text-white">🔴 On Call</option>
                )}
                <option value="OFFLINE" className="bg-slate-900 text-white">⚪ Offline</option>
              </select>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                title="Minimize Softphone"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* ACTIVE CALL CONTROL SCREEN (When call is connected/ringing)  */}
          {/* ------------------------------------------------------------- */}
          {isCallActive && activeCall ? (
            <div className="p-4 bg-slate-900 text-white flex flex-col gap-3.5">
              {/* Connected Banner & Timer */}
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      {activeCall.status === "RINGING" ? "Ringing..." : "Connected"}
                    </span>
                    {isMuted && (
                      <span className="bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                        Muted
                      </span>
                    )}
                    {isOnHold && (
                      <span className="bg-amber-400 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                        On Hold
                      </span>
                    )}
                  </div>

                  <h3 className="font-mono text-base font-bold text-white mt-1">
                    {activeCall.direction === "INBOUND" ? activeCall.callerNumber : activeCall.calleeNumber}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {activeCall.direction === "INBOUND" ? "Inbound Call" : "Outbound Call"} • Ext {activeCall.agentExtension}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-700/50 px-2.5 py-1 rounded-xl font-mono text-sm font-bold text-emerald-300">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{formatTimer(callDuration)}</span>
                  </div>

                  <button
                    onClick={onOpenDispositionModal}
                    className="text-[11px] text-indigo-300 hover:text-white font-medium flex items-center gap-1 mt-1.5 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Lead Details</span>
                  </button>
                </div>
              </div>

              {/* In-Call Telephony Action Bar (End, Transfer, Mute, Dial Number) */}
              <div className="grid grid-cols-4 gap-2">
                {/* 1. MUTE / UNMUTE */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 ${
                    isMuted
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20"
                      : "bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  <span className="text-[10px] font-semibold mt-1">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </button>

                {/* 2. TRANSFER TO EXTENSION */}
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferPanel(!showTransferPanel);
                    setShowInCallKeypad(false);
                    fetchTeamAgents();
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 ${
                    showTransferPanel
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50"
                      : "bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700"
                  }`}
                  title="Transfer Call to Another Extension"
                >
                  <PhoneForwarded className="h-5 w-5" />
                  <span className="text-[10px] font-semibold mt-1">Transfer</span>
                </button>

                {/* 3. DIAL NUMBER / DTMF KEYPAD */}
                <button
                  type="button"
                  onClick={() => {
                    setShowInCallKeypad(!showInCallKeypad);
                    setShowTransferPanel(false);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 ${
                    showInCallKeypad
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50"
                      : "bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700"
                  }`}
                  title="In-Call DTMF Dialpad"
                >
                  <Grid className="h-5 w-5" />
                  <span className="text-[10px] font-semibold mt-1">Keypad</span>
                </button>

                {/* 4. END CALL */}
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                  title="Hang Up / End Call"
                >
                  <PhoneOff className="h-5 w-5" />
                  <span className="text-[10px] font-semibold mt-1">End Call</span>
                </button>
              </div>

              {/* --------------------------------------------------------- */}
              {/* TRANSFER PANEL DRAWER                                     */}
              {/* --------------------------------------------------------- */}
              {showTransferPanel && (
                <div className="bg-slate-800/95 border border-indigo-500/40 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                      <PhoneForwarded className="h-3.5 w-3.5" />
                      <span>Transfer to Extension</span>
                    </div>
                    <button
                      onClick={() => setShowTransferPanel(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Target Extension Input */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                      Target Extension Number:
                    </label>
                    <input
                      type="text"
                      value={transferTargetExt}
                      onChange={(e) => setTransferTargetExt(e.target.value)}
                      placeholder="e.g. 102"
                      className="w-full text-sm font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Quick Select Team Members */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                      Available Agents / Extensions:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {teamAgents.map((ag) => (
                        <button
                          key={ag.id}
                          type="button"
                          onClick={() => setTransferTargetExt(ag.rcExtension || "")}
                          className={`text-left p-1.5 rounded-lg border text-[11px] transition-all flex items-center justify-between ${
                            transferTargetExt === ag.rcExtension
                              ? "bg-indigo-600/40 border-indigo-400 text-white"
                              : "bg-slate-900/60 border-slate-700/80 text-slate-300 hover:bg-slate-700/50"
                          }`}
                        >
                          <div className="truncate">
                            <p className="font-semibold leading-tight truncate">{ag.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono">Ext {ag.rcExtension}</p>
                          </div>
                          {transferTargetExt === ag.rcExtension && (
                            <Check className="h-3.5 w-3.5 text-indigo-300 shrink-0 ml-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transfer Note */}
                  <div>
                    <input
                      type="text"
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="Transfer reason / context note..."
                      className="w-full text-[11px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Action Button */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!transferTargetExt.trim() || isTransferring}
                      onClick={handleTransferCall}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PhoneForwarded className="h-3.5 w-3.5" />
                      <span>{isTransferring ? "Transferring..." : `Transfer to Ext ${transferTargetExt || "..."}`}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* IN-CALL DTMF DIALPAD                                      */}
              {/* --------------------------------------------------------- */}
              {showInCallKeypad && (
                <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Hash className="h-3.5 w-3.5" />
                      <span>In-Call DTMF Dialpad</span>
                    </div>

                    {inCallDtmfDigits && (
                      <button
                        onClick={() => setInCallDtmfDigits("")}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Display of dialed digits */}
                  <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 font-mono text-center text-sm font-bold tracking-widest text-emerald-300 min-h-[30px] flex items-center justify-center">
                    {inCallDtmfDigits || <span className="text-slate-500 text-xs font-normal">Press buttons to send touch tones</span>}
                  </div>

                  {/* Keypad Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {KEYPAD_KEYS.map((k) => (
                      <button
                        key={k.digit}
                        type="button"
                        onClick={() => handleInCallKeyPress(k.digit)}
                        className="flex flex-col items-center justify-center h-10 rounded-xl bg-slate-900/90 hover:bg-slate-700 border border-slate-700/80 text-white transition-all active:scale-95"
                      >
                        <span className="text-sm font-bold leading-none">{k.digit}</span>
                        {k.sub && (
                          <span className="text-[7px] text-slate-400 leading-none mt-0.5">{k.sub}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Navigation Tabs (Available when not in call or toggled) */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab("dialer")}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "dialer" ? "border-b-2 border-indigo-600 text-indigo-700 bg-white" : "hover:bg-slate-100"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Outbound Dialer</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("recent");
                fetchRecentCalls();
              }}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "recent" ? "border-b-2 border-indigo-600 text-indigo-700 bg-white" : "hover:bg-slate-100"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Call Log</span>
            </button>
          </div>

          {/* Body: Outbound Dialer or Call Log */}
          <div className="p-4 flex-1">
            {activeTab === "dialer" ? (
              <div className="space-y-4">
                {/* Phone Number Display Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number..."
                    className="w-full text-center font-mono text-lg font-bold text-slate-800 tracking-wider py-2.5 px-8 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {phoneNumber && (
                    <button
                      onClick={handleBackspace}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                      title="Backspace"
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {KEYPAD_KEYS.map((k) => (
                    <button
                      key={k.digit}
                      type="button"
                      onClick={() => handleKeyPress(k.digit)}
                      className="flex flex-col items-center justify-center h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-indigo-50 border border-slate-200 text-slate-800 transition-all active:scale-95 shadow-xs"
                    >
                      <span className="text-base font-bold leading-none">{k.digit}</span>
                      {k.sub && <span className="text-[8px] font-semibold text-slate-400 uppercase leading-none mt-0.5">{k.sub}</span>}
                    </button>
                  ))}
                </div>

                {/* Dial Button */}
                <div className="pt-1">
                  <button
                    disabled={!phoneNumber.trim() || isDialing}
                    onClick={handleDial}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                  >
                    <Phone className="h-4 w-4 fill-white" />
                    <span>Call via Ext {currentUser.rcExtension || "101"}</span>
                  </button>
                </div>

                {/* Quick Simulation Trigger */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">RingCentral Test Tool</span>
                  <button
                    onClick={handleSimulateInboundCall}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                    title="Simulate an inbound customer call ringing to your extension"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Test Inbound Ring</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Recent Calls Tab */
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recentCalls.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">No calls recorded on Ext {currentUser.rcExtension || "101"} yet.</p>
                ) : (
                  recentCalls.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 truncate">
                          <span className={`text-[10px] px-1 py-0.2 rounded font-sans uppercase font-bold ${
                            c.direction === "INBOUND" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {c.direction === "INBOUND" ? "IN" : "OUT"}
                          </span>
                          <span className="truncate">{c.direction === "INBOUND" ? c.callerNumber : c.calleeNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{c.durationSeconds ? `${Math.floor(c.durationSeconds / 60)}m ${c.durationSeconds % 60}s` : "0s"}</span>
                          <span>•</span>
                          <span className="capitalize">{c.status.toLowerCase()}</span>
                          {c.disposition && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 font-semibold truncate">{c.disposition.replace(/_/g, " ")}</span>
                            </>
                          )}
                          {c.transferredToExtension && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 font-semibold">Transferred to Ext {c.transferredToExtension}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const num = c.direction === "INBOUND" ? c.callerNumber : c.calleeNumber;
                          setPhoneNumber(num);
                          setActiveTab("dialer");
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg ml-2"
                        title="Redial"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
