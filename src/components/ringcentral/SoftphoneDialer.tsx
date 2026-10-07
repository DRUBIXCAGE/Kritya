"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Delete,
  Clock,
  History,
  Grid,
  Minimize2,
  Mic,
  MicOff,
  FileText,
  Check,
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

  // In-call state
  const [isMuted, setIsMuted] = useState(false);
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [inCallDtmfDigits, setInCallDtmfDigits] = useState("");
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [transferTargetExt, setTransferTargetExt] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const [teamAgents, setTeamAgents] = useState<{ id: string; name: string; rcExtension?: string }[]>([]);
  const [status, setStatus] = useState<"AVAILABLE" | "BUSY" | "ON_CALL" | "OFFLINE">(
    currentUser.rcStatus || "AVAILABLE"
  );

  const isCallActive = Boolean(
    activeCall && (activeCall.status === "ANSWERED" || activeCall.status === "RINGING")
  );

  useEffect(() => {
    if (isCallActive) {
      setStatus("ON_CALL");
    } else {
      setStatus(currentUser.rcStatus || "AVAILABLE");
      setIsMuted(false);
      setShowInCallKeypad(false);
      setShowTransferPanel(false);
      setInCallDtmfDigits("");
    }
  }, [isCallActive, currentUser.rcStatus]);

  // Live timer
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

  const fetchRecentCalls = async () => {
    try {
      const ext = currentUser.rcExtension || "101";
      const res = await fetch(`/api/ringcentral/calls?extension=${ext}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.callLogs)) {
        setRecentCalls(data.callLogs.slice(0, 8));
      }
    } catch {}
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
        { id: "usr_dir_alex", name: "Alex Thorne", rcExtension: "100" },
        { id: "usr_sales_agent2", name: "Marcus Brooks", rcExtension: "102" },
        { id: "usr_sales_agent3", name: "Rachel Vance", rcExtension: "103" },
        { id: "usr_sales_agent4", name: "David Miller", rcExtension: "104" },
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

  const handleInCallKeyPress = (digit: string) => {
    playDtmfTone(digit);
    setInCallDtmfDigits((prev) => prev + digit);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playMuteTone(nextMuted);
  };

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
        }),
      });
      const data = await res.json();
      if (data.success && data.call) {
        onCallUpdated(data.call);
        setShowTransferPanel(false);
        setTransferTargetExt("");
      } else {
        alert(data.error || "Transfer failed");
      }
    } catch {
      alert("Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

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
    } catch {
      alert("Dial failed");
    } finally {
      setIsDialing(false);
    }
  };

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
    } catch {}
  };

  return (
    <>
      {/* Sleek Floating Launcher (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-lg border text-white text-xs font-semibold transition-all active:scale-95 ${
              isCallActive
                ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800"
            }`}
          >
            <Phone className={`h-3.5 w-3.5 ${isCallActive ? "animate-bounce" : ""}`} />
            <span>{isCallActive ? `Call (${formatTimer(callDuration)})` : "Phone"}</span>
            <span className="font-mono text-[10px] text-slate-300">
              Ext {currentUser.rcExtension || "101"}
            </span>
          </button>
        </div>
      )}

      {/* Sleek Floating Softphone Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-40 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className={`h-3.5 w-3.5 ${isCallActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span className="text-xs font-bold">RingCentral</span>
              <span className="text-[10px] font-mono text-slate-400">
                Ext {currentUser.rcExtension || "101"}
              </span>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Minimize"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ACTIVE CALL VIEW (Clean, uncluttered, focused) */}
          {isCallActive && activeCall ? (
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col items-center text-center space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 flex items-center justify-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeCall.status === "RINGING" ? "Ringing..." : "Connected"}
                </span>

                <h3 className="font-mono text-base font-bold text-slate-900 mt-0.5">
                  {activeCall.direction === "INBOUND" ? activeCall.callerNumber : activeCall.calleeNumber}
                </h3>

                <div className="flex items-center justify-center gap-1 text-xs font-mono font-bold text-slate-500 mt-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{formatTimer(callDuration)}</span>
                </div>
              </div>

              {/* 4 Clean In-Call Control Circles */}
              <div className="flex items-center justify-center gap-2.5 pt-1">
                {/* 1. Mute */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                    isMuted
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {/* 2. Keypad */}
                <button
                  type="button"
                  onClick={() => {
                    setShowInCallKeypad(!showInCallKeypad);
                    setShowTransferPanel(false);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                    showInCallKeypad
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                  title="In-call keypad"
                >
                  <Hash className="h-4 w-4" />
                </button>

                {/* 3. Transfer */}
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferPanel(!showTransferPanel);
                    setShowInCallKeypad(false);
                    fetchTeamAgents();
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                    showTransferPanel
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                  title="Transfer Call"
                >
                  <PhoneForwarded className="h-4 w-4" />
                </button>

                {/* 4. Hang up */}
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all active:scale-95"
                  title="Hang Up"
                >
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>

              {/* Collapsible Keypad */}
              {showInCallKeypad && (
                <div className="w-full bg-white border border-slate-200 rounded-xl p-2.5 animate-in fade-in">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-slate-600">
                    <span>Digits: {inCallDtmfDigits || "-"}</span>
                    {inCallDtmfDigits && (
                      <button onClick={() => setInCallDtmfDigits("")} className="text-slate-400 hover:text-slate-600 text-[10px]">
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleInCallKeyPress(d)}
                        className="py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Transfer */}
              {showTransferPanel && (
                <div className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-left animate-in fade-in space-y-2">
                  <span className="text-[10px] font-bold text-slate-600 block">Transfer to Extension:</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={transferTargetExt}
                      onChange={(e) => setTransferTargetExt(e.target.value)}
                      placeholder="Ext (102)"
                      className="w-20 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={!transferTargetExt.trim() || isTransferring}
                      onClick={handleTransferCall}
                      className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold"
                    >
                      {isTransferring ? "..." : "Transfer"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teamAgents.map((ag) => (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => setTransferTargetExt(ag.rcExtension || "")}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono"
                      >
                        {ag.name.split(" ")[0]} ({ag.rcExtension})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Lead Form Button */}
              <button
                type="button"
                onClick={onOpenDispositionModal}
                className="w-full py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Open Lead Details Form</span>
              </button>
            </div>
          ) : null}

          {/* Clean Dialpad Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab("dialer")}
              className={`flex-1 py-2 text-center transition-colors ${
                activeTab === "dialer" ? "border-b-2 border-indigo-600 text-indigo-700 bg-white" : "hover:bg-slate-100"
              }`}
            >
              Keypad
            </button>
            <button
              onClick={() => {
                setActiveTab("recent");
                fetchRecentCalls();
              }}
              className={`flex-1 py-2 text-center transition-colors ${
                activeTab === "recent" ? "border-b-2 border-indigo-600 text-indigo-700 bg-white" : "hover:bg-slate-100"
              }`}
            >
              Recent
            </button>
          </div>

          {/* Outbound Keypad Body */}
          <div className="p-3.5 flex-1">
            {activeTab === "dialer" ? (
              <div className="space-y-3">
                {/* Number Display */}
                <div className="relative">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone..."
                    className="w-full text-center font-mono text-base font-bold text-slate-900 py-2 px-6 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  {phoneNumber && (
                    <button
                      onClick={() => setPhoneNumber((p) => p.slice(0, -1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <Delete className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {KEYPAD_KEYS.map((k) => (
                    <button
                      key={k.digit}
                      type="button"
                      onClick={() => handleKeyPress(k.digit)}
                      className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 transition-all active:scale-95 flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-bold leading-none">{k.digit}</span>
                      {k.sub && <span className="text-[7px] text-slate-400 leading-none mt-0.5">{k.sub}</span>}
                    </button>
                  ))}
                </div>

                {/* Call Button */}
                <button
                  disabled={!phoneNumber.trim() || isDialing}
                  onClick={handleDial}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5 fill-white" />
                  <span>Call</span>
                </button>

                {/* Subtle Test Simulation Link */}
                <div className="pt-1 text-center">
                  <button
                    onClick={handleSimulateInboundCall}
                    className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    Simulate test incoming call
                  </button>
                </div>
              </div>
            ) : (
              /* Recent Calls */
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {recentCalls.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">No recent calls on this extension.</p>
                ) : (
                  recentCalls.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-xs"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <p className="font-mono font-semibold text-slate-800 truncate">
                          {c.direction === "INBOUND" ? c.callerNumber : c.calleeNumber}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {c.direction === "INBOUND" ? "Inbound" : "Outbound"} • {c.durationSeconds ? `${c.durationSeconds}s` : "0s"}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setPhoneNumber(c.direction === "INBOUND" ? c.callerNumber : c.calleeNumber);
                          setActiveTab("dialer");
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600"
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
