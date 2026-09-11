"use client";

import React, { useState, useEffect } from "react";
import { Lead, User } from "@/types";
import {
  PREDEFINED_EMAIL_TEMPLATES,
  renderEmailTemplate,
  OFFICIAL_SENDER_EMAIL,
  OFFICIAL_SENDER_NAME,
} from "@/lib/templates";
import { RichTextEmailEditor } from "@/components/common/RichTextEmailEditor";
import {
  Mail,
  Send,
  X,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Tag,
  AtSign,
} from "lucide-react";

interface PredefinedEmailModalProps {
  isOpen: boolean;
  lead: Lead | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export function PredefinedEmailModal({
  isOpen,
  lead,
  currentUser,
  onClose,
  onSuccess,
}: PredefinedEmailModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("flight_auth_01");
  const [isSending, setIsSending] = useState(false);

  // Editable fields
  const [recipientEmail, setRecipientEmail] = useState<string>(lead?.email || "");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBodyHtml, setCustomBodyHtml] = useState<string>("");

  const bookingRef = lead?.bookingNumber
    ? `#${lead.bookingNumber}`
    : (lead?.bookingDetails?.pnrCode || (lead ? "TC-" + lead.id.substring(lead.id.length - 6).toUpperCase() : "TC-BOOKING"));

  useEffect(() => {
    if (lead) {
      const template =
        PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
        PREDEFINED_EMAIL_TEMPLATES[0];
      const preview = renderEmailTemplate(template, lead, currentUser.name);
      setCustomSubject(preview.subject);
      setCustomBodyHtml(preview.body);
      setRecipientEmail(lead.email);
    }
  }, [lead, selectedTemplateId, currentUser.name]);

  if (!isOpen || !lead) return null;

  const handleResetDefaults = () => {
    const template =
      PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      PREDEFINED_EMAIL_TEMPLATES[0];
    const preview = renderEmailTemplate(template, lead, currentUser.name);
    setCustomSubject(preview.subject);
    setCustomBodyHtml(preview.body);
    setRecipientEmail(lead.email);
  };

  const handleInsertBookingIdPrefix = () => {
    const prefix = `[Booking ID: ${bookingRef}] `;
    if (!customSubject.startsWith(prefix)) {
      // Remove any existing bracketed booking tag if any
      const cleaned = customSubject.replace(/^\[Booking ID: [^\]]+\]\s*/i, "");
      setCustomSubject(`${prefix}${cleaned}`);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Enforce booking ID in subject
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
          body: customBodyHtml,
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Email dispatch failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-4 sm:p-6 text-slate-100 max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Travel Email Editor & Dispatcher
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Draft, format rich text, paste screenshots, and send official customer correspondence.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sender & Template Toolbar */}
        <div className="mt-3 space-y-2">
          {/* Mandatory Single Sender Info Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">From Official Address:</span>
                <span className="px-2 py-0.5 rounded bg-indigo-900/80 font-mono font-bold text-indigo-200 border border-indigo-700/60 text-[11px]">
                  {OFFICIAL_SENDER_EMAIL}
                </span>
                <span className="text-[10px] text-indigo-300/80">({OFFICIAL_SENDER_NAME})</span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DKIM / SPF Verified
            </div>
          </div>

          {/* Template Selector Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <span>Select Template:</span>
              </label>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/70 border border-indigo-800 px-2 py-0.5 rounded transition"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset to Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {PREDEFINED_EMAIL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`p-2 rounded-lg text-left text-xs font-medium border transition ${
                    selectedTemplateId === t.id
                      ? "bg-indigo-950 text-indigo-200 border-indigo-500 shadow-sm"
                      : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="font-semibold truncate">{t.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 uppercase font-mono">{t.type}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editable Form Controls */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
          {/* 1. Recipient Address */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AtSign className="h-3 w-3 text-indigo-400" />
                To (Recipient Customer Email):
              </span>
              <span className="text-[10px] font-mono text-slate-500">Customer Verified</span>
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
              className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* 2. Subject Line with Booking ID Requirement */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Tag className="h-3 w-3 text-indigo-400" />
                Subject Line (Must contain Booking ID):
              </label>
              <button
                type="button"
                onClick={handleInsertBookingIdPrefix}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/70 border border-cyan-800 px-1.5 py-0.5 rounded transition"
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
              className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-indigo-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* 3. Rich Text Email Body with Image Paste Support */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>Message Body (Rich Text & Image Paste Enabled):</span>
              <span className="text-[10px] font-mono text-indigo-300">Ctrl+V to paste screenshot</span>
            </label>
            <RichTextEmailEditor
              value={customBodyHtml}
              onChange={setCustomBodyHtml}
              minHeight="200px"
              maxHeight="320px"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-3">
          <div className="text-[11px] text-slate-400 truncate max-w-sm hidden sm:block">
            Sending from <strong className="text-slate-200">{OFFICIAL_SENDER_EMAIL}</strong> to <strong className="text-indigo-300">{recipientEmail || lead.email}</strong>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={handleSend}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? "Dispatching..." : "Send Travel Email"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
