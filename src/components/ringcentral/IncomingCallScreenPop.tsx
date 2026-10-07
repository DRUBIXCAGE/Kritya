"use client";

import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, Volume2, VolumeX, User, Sparkles } from "lucide-react";
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
  const [matchedName, setMatchedName] = useState<string | null>(null);

  // Ringtone loop
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

  // Lead match lookup
  useEffect(() => {
    if (!incomingCall) {
      setMatchedName(null);
      return;
    }

    let isCancelled = false;
    const fetchLeadMatch = async () => {
      try {
        if (incomingCall.callerNumber) {
          const clean = incomingCall.callerNumber.replace(/[^0-9]/g, "");
          const res = await fetch("/api/leads");
          const data = await res.json();
          if (!isCancelled && data.success && Array.isArray(data.leads)) {
            const found = data.leads.find((l: { phone?: string; name?: string }) => {
              const lp = (l.phone || "").replace(/[^0-9]/g, "");
              return lp.length >= 7 && (clean.endsWith(lp) || lp.endsWith(clean));
            });
            if (found && !isCancelled) {
              setMatchedName(found.name || null);
            }
          }
        }
      } catch {}
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
    <div className="fixed top-5 right-5 z-50 w-84 max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="bg-white rounded-2xl border border-emerald-400 shadow-xl p-4 ring-2 ring-emerald-500/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">
              Incoming Call
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
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
            className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
            title={isAudioMuted ? "Unmute ringtone" : "Mute ringtone"}
          >
            {isAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Caller Info */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-3">
          <p className="text-sm font-bold font-mono text-slate-900">
            {incomingCall.callerNumber}
          </p>
          {matchedName ? (
            <p className="text-xs text-indigo-700 font-semibold flex items-center gap-1 mt-0.5">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              <span>{matchedName}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">
              New Inbound Customer
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDeclineClick}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all active:scale-95"
          >
            <PhoneOff className="h-3.5 w-3.5 text-rose-600" />
            <span>Decline</span>
          </button>

          <button
            onClick={handleAnswerClick}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <Phone className="h-3.5 w-3.5 fill-white" />
            <span>Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
