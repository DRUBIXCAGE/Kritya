"use client";

import React, { useEffect, useState } from "react";
import { ChatMessage } from "@/types";
import { X, ArrowRight, ShieldCheck, Crown, Sparkles, Hash, Users, Bell } from "lucide-react";

export interface ToastItem {
  id: string;
  message: ChatMessage;
  timestamp: number;
}

interface ChatNotificationToastProps {
  notifications: ToastItem[];
  onDismiss: (id: string) => void;
  onOpenReply: (message: ChatMessage) => void;
}

export function ChatNotificationToast({
  notifications,
  onDismiss,
  onOpenReply,
}: ChatNotificationToastProps) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <aside
      aria-label="Chat notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {notifications.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onDismiss={() => onDismiss(item.id)}
          onOpenReply={() => onOpenReply(item.message)}
        />
      ))}
    </aside>
  );
}

function ToastCard({
  item,
  onDismiss,
  onOpenReply,
}: {
  item: ToastItem;
  onDismiss: () => void;
  onOpenReply: () => void;
}) {
  const { message } = item;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 7000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onDismiss]);

  const isSuperAdmin = message.senderRole === "SUPER_ADMIN" || message.senderRole === "ADMIN";
  const isManager = message.senderRole.endsWith("_MANAGER");
  const isDirect = !message.channelId && message.recipientId;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-full bg-white/95 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-400/30 overflow-hidden transform transition-all duration-300 ease-out translate-y-0 opacity-100 animate-in fade-in slide-in-from-bottom-5"
    >
      {/* Top Banner with pulsating glow */}
      <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 px-3.5 py-1.5 flex items-center justify-between text-white text-[11px] font-bold">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-100"></span>
          </span>
          <span className="font-mono tracking-wide flex items-center gap-1">
            <Bell className="h-3 w-3 inline text-amber-200" />
            {message.messageType === "APPROVAL_REQUEST"
              ? "Escalation & Approval Request"
              : message.messageType === "HIERARCHY_UPDATE"
              ? "Hierarchy Announcement"
              : isDirect
              ? "Direct Message Received"
              : "New Channel Message"}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-0.5 transition cursor-pointer"
          title="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Content Body */}
      <div className="p-3.5 space-y-2.5">
        {/* Highlighted Sender & Destination */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Sender Avatar Badge with glowing outline */}
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-2 ${
                isSuperAdmin
                  ? "bg-purple-600 text-white ring-purple-300"
                  : isManager
                  ? "bg-indigo-600 text-white ring-indigo-300"
                  : "bg-amber-500 text-white ring-amber-300"
              }`}
            >
              {message.senderName.charAt(0).toUpperCase()}
            </div>

            {/* Sender Name prominently highlighted */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs bg-amber-100 text-amber-950 px-2 py-0.5 rounded-md border border-amber-300 shadow-2xs">
                  {message.senderName}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    isSuperAdmin
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : isManager
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {message.senderRole}
                </span>
              </div>
            </div>
          </div>

          {/* Channel or DM target pill */}
          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            {isDirect ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1">
                <Users className="h-2.5 w-2.5 text-slate-500" />
                Direct DM
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center gap-1 font-bold">
                <Hash className="h-2.5 w-2.5 text-indigo-500" />
                {message.channelId || "general"}
              </span>
            )}
          </div>
        </div>

        {/* Message snippet */}
        <p className="text-xs text-slate-700 line-clamp-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-sans">
          {message.content}
        </p>

        {/* Attached Lead / Booking Reference if present */}
        {message.leadBookingNumber && (
          <div className="flex items-center justify-between text-[11px] font-mono bg-amber-50/90 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
            <span className="font-bold">Booking #{message.leadBookingNumber}</span>
            {message.leadPnr && <span className="text-slate-600">PNR: {message.leadPnr}</span>}
          </div>
        )}

        {/* Action Button: Open & Reply */}
        <div className="pt-1 flex items-center justify-end gap-2">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={onOpenReply}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open & Reply</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Auto-dismiss progress timer line */}
      <div className="w-full bg-slate-100 h-1">
        <div
          className="bg-gradient-to-r from-amber-500 to-indigo-600 h-full transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
