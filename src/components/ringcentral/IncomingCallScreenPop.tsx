"use client";

import React, { useEffect, useState } from "react";
import { Phone, PhoneCall, PhoneOff, Volume2, VolumeX, User, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { CallLog } from "@/types";
import { startRingtoneLoop, stopRingtoneLoop, playCallConnectedTone } from "@/lib/ringcentral";

interface IncomingCallScreenPopProps {
  incomingCall: CallLog | null;
  onAnswer: (call: CallLog) => void;
  onDecline: (call: CallLog) => void;
  agentExtension: string;
}

export function IncomingCallScreenPop({
  incomingCall,
  onAnswer,
  onDecline,
  agentExtension,
}: IncomingCallScreenPopProps) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [matchedLeadInfo, setMatchedLeadInfo] = useState<{
    name?: string;
    bookingNumber?: number;
    route?: string;
    dealValue?: number;
  } | null>(null);

  // Play realistic phone ringing audio when incoming call arrives
  useEffect(() => {
    if (incomingCall && incomingCall.status === "RINGING") {
      if (!isAudioMuted) {
        startRingtoneLoop();
      }
    } else {
      stopRingtoneLoop();
    }

    return () => {
      stopRingtoneLoop();
    };
  }, [incomingCall, isAudioMuted]);

  // Lookup lead details if leadId or phone is present
  useEffect(() => {
    if (!incomingCall) {
      setMatchedLeadInfo(null);
      return;
    }

    let isCancelled = false;
    const fetchLeadMatch = async () => {
      try {
        if (incomingCall.leadId) {
          const res = await fetch(`/api/leads/${incomingCall.leadId}`);
          const data = await res.json();
          if (!isCancelled && data.success && data.lead) {
            setMatchedLeadInfo({
              name: data.lead.name,
              bookingNumber: data.lead.bookingNumber,
              route: data.lead.bookingDetails
                ? `${data.lead.bookingDetails.origin} -> ${data.lead.bookingDetails.destination}`
                : undefined,
              dealValue: data.lead.dealValue,
            });
            return;
          }
        }

        // Search by phone
        if (incomingCall.callerNumber) {
          const clean = incomingCall.callerNumber.replace(/[^0-9]/g, "");
          const res = await fetch("/api/leads");
          const data = await res.json();
          if (!isCancelled && data.success && Array.isArray(data.leads)) {
            const found = data.leads.find((l: { phone?: string }) => {
              const lp = (l.phone || "").replace(/[^0-9]/g, "");
              return lp.length >= 7 && (clean.endsWith(lp) || lp.endsWith(clean));
            });
            if (found) {
              setMatchedLeadInfo({
                name: found.name,
                bookingNumber: found.bookingNumber,
                route: found.bookingDetails
                  ? `${found.bookingDetails.origin} -> ${found.bookingDetails.destination}`
                  : undefined,
                dealValue: found.dealValue,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Lead match lookup failed:", err);
      }
    };

    fetchLeadMatch();
    return () => {
      isCancelled = true;
    };
  }, [incomingCall]);

  if (!incomingCall || incomingCall.status !== "RINGING") {
    return null;
  }

  const handleAnswerClick = () => {
    stopRingtoneLoop();
    playCallConnectedTone();
    onAnswer(incomingCall);
  };

  const handleDeclineClick = () => {
    stopRingtoneLoop();
    onDecline(incomingCall);
  };

  return (
    <div className="fixed top-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400 bg-white/95 backdrop-blur-xl shadow-2xl p-5 ring-4 ring-emerald-500/20">
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              RingCentral Inbound
            </span>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Ext {agentExtension || incomingCall.agentExtension}
            </span>
          </div>

          <button
            onClick={() => {
              if (isAudioMuted) {
                setIsAudioMuted(false);
              } else {
                setIsAudioMuted(true);
                stopRingtoneLoop();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={isAudioMuted ? "Unmute ringtone" : "Mute ringtone"}
          >
            {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Caller Info Box */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <PhoneCall className="h-6 w-6 animate-bounce" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Incoming Call From</p>
              <h4 className="text-lg font-bold font-mono text-slate-900 tracking-tight truncate">
                {incomingCall.callerNumber}
              </h4>

              {matchedLeadInfo ? (
                <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold truncate">
                    <Sparkles className="h-3 w-3 text-indigo-600" />
                    <span>Matched Lead: {matchedLeadInfo.name}</span>
                    {matchedLeadInfo.bookingNumber && (
                      <span className="bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded font-mono text-[10px]">
                        #{matchedLeadInfo.bookingNumber}
                      </span>
                    )}
                  </div>
                  {matchedLeadInfo.route && (
                    <p className="text-[11px] text-slate-600 truncate">
                      Route: {matchedLeadInfo.route}
                    </p>
                  )}
                  {matchedLeadInfo.dealValue !== undefined && matchedLeadInfo.dealValue > 0 && (
                    <p className="text-[11px] text-emerald-600 font-semibold">
                      Value: ${matchedLeadInfo.dealValue.toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <User className="h-3 w-3" /> New Customer (Lead Form Ready)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDeclineClick}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-all shadow-xs active:scale-95"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={handleAnswerClick}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 active:scale-95 animate-pulse"
          >
            <Phone className="h-4 w-4 fill-white" />
            <span>Answer Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
