"use client";

import React, { useState } from "react";
import { X, MessageSquare, Send, CheckCircle, Clock, ShieldCheck, Tag, Sparkles } from "lucide-react";
import { Lead, User } from "@/types";

interface QuickRemarkModalProps {
  isOpen: boolean;
  lead: Lead | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_TAGS = [
  { label: "📞 Inbound Call Answered", text: "Customer reached via inbound call; discussed routing options and quoted current fare." },
  { label: "💰 Quoted Fare & MCO", text: "Quoted gross fare to customer; awaiting confirmation on pricing and seat selection." },
  { label: "📄 Passport & Pax Verified", text: "Verified passenger passport spelling and validity matches official manifest." },
  { label: "💳 Payment Auth Verified", text: "Payment authorization details submitted; pending manager clearance check." },
  { label: "🚀 PPC Lead Follow-up", text: "Reached out to PPC ad inquiry; customer expressed high interest in business class departure." },
  { label: "⏰ Callback Scheduled", text: "Customer requested a callback in 2 hours to confirm travel companion details." },
  { label: "🚨 Manager Escalation", text: "Escalated fare discrepancy / special discount request to Sales Manager for review." },
];

export function QuickRemarkModal({
  isOpen,
  lead,
  currentUser,
  onClose,
  onSuccess,
}: QuickRemarkModalProps) {
  const [remarkText, setRemarkText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const handleSelectTag = (tag: typeof PRESET_TAGS[0]) => {
    setSelectedTag(tag.label);
    setRemarkText((prev) => (prev ? `${prev}\n${tag.text}` : tag.text));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/fingerprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "QUERY_REMARK_RECORDED",
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          isAutoLogged: false,
          remark: remarkText.trim(),
          metadata: {
            source: "DASHBOARD_QUICK_REMARK_MODAL",
            bookingNumber: lead.bookingNumber,
            passengerName: lead.name,
            tag: selectedTag,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRemarkText("");
        setSelectedTag(null);
        onSuccess();
        onClose();
      } else {
        alert("Failed to save remark: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Remark save error:", err);
      alert("Failed to save remark.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl p-4 sm:p-5 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Log Query Remark</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  #{lead.bookingNumber || lead.bookingId || lead.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {lead.name} • {lead.bookingDetails?.origin || "Origin"} &rarr; {lead.bookingDetails?.destination || "Dest"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Existing Latest Remark Snippet */}
        {lead.lastRemarkSnippet && (
          <div className="my-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">
              Latest Logged Note:
            </span>
            <p className="text-slate-700 line-clamp-2 italic text-[11px]">
              &ldquo;{lead.lastRemarkSnippet}&rdquo;
            </p>
          </div>
        )}

        {/* Quick Tag Shortcuts */}
        <div className="my-3">
          <span className="text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider flex items-center gap-1 mb-1.5">
            <Tag className="h-3 w-3 text-indigo-600" />
            Quick Remark Templates:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => handleSelectTag(t)}
                className={`px-2 py-1 rounded text-[10px] font-medium border transition ${
                  selectedTag === t.label
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Remark Text Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Remark / Customer Note Details:
            </label>
            <textarea
              rows={4}
              required
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Enter client conversation summary, quoted rates, follow-up timeline, or PPC inquiry details..."
              className="w-full rounded-lg bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Logged as: <strong>{currentUser.name}</strong> ({currentUser.role})
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !remarkText.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Recording..." : "Record Remark"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
