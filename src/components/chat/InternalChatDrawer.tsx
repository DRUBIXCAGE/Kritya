"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { User, Role, Lead, ChatMessage, ChatChannel, ChatMessageType } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  Users,
  Hash,
  Crown,
  Plane,
  CreditCard,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Tag,
  Bell,
  RefreshCw,
} from "lucide-react";

interface InternalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  leads: Lead[];
  onOpenLeadWorkspace?: (lead: Lead) => void;
  initialLead?: Lead;
  initialChannelId?: string;
  initialRecipientId?: string;
}

export function InternalChatDrawer({
  isOpen,
  onClose,
  currentUser,
  users,
  leads,
  onOpenLeadWorkspace,
  initialLead,
  initialChannelId,
  initialRecipientId,
}: InternalChatDrawerProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId || (initialRecipientId ? "" : "sales-operations"));
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(initialRecipientId || null);
  const [inputText, setInputText] = useState("");
  const [messageType, setMessageType] = useState<ChatMessageType>("TEXT");
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || "");
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLeadPicker, setShowLeadPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // When initial channel or recipient changes
  useEffect(() => {
    if (initialChannelId) {
      setActiveChannelId(initialChannelId);
      setActiveRecipientId(null);
    } else if (initialRecipientId) {
      setActiveRecipientId(initialRecipientId);
      setActiveChannelId("");
    }
  }, [initialChannelId, initialRecipientId]);

  // When initial lead changes, set it
  useEffect(() => {
    if (initialLead) {
      setSelectedLeadId(initialLead.id);
      setMessageType("APPROVAL_REQUEST");
    }
  }, [initialLead]);

  // Calculate unread counts per channel & direct sender for currentUser
  const { unreadByChannel, unreadBySender } = useMemo(() => {
    const byCh: Record<string, number> = {};
    const bySender: Record<string, number> = {};

    messages.forEach((m) => {
      if (!m.readBy.includes(currentUser.id)) {
        if (m.channelId) {
          byCh[m.channelId] = (byCh[m.channelId] || 0) + 1;
        } else if (m.senderId && m.recipientId === currentUser.id) {
          bySender[m.senderId] = (bySender[m.senderId] || 0) + 1;
        }
      }
    });

    return { unreadByChannel: byCh, unreadBySender: bySender };
  }, [messages, currentUser.id]);

  // Fetch initial chat data
  const fetchChatData = async () => {
    try {
      const res = await fetch(`/api/chat?userId=${currentUser.id}&role=${currentUser.role}`);
      if (res.ok) {
        const data = await res.json();
        if (data.channels) setChannels(data.channels);
        if (data.messages) setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load chat data:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChatData();
    }
  }, [isOpen, currentUser.id]);

  // Listen to SSE / Global Custom Events for new chat messages
  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ message: ChatMessage }>;
      if (custom.detail?.message) {
        const newMsg = custom.detail.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    window.addEventListener("kritya:chat_message", handleCustomEvent);
    return () => {
      window.removeEventListener("kritya:chat_message", handleCustomEvent);
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannelId, activeRecipientId]);

  // Mark active thread read
  useEffect(() => {
    if (!isOpen) return;
    const unreadInThread = messages.some((m) => {
      if (m.readBy.includes(currentUser.id)) return false;
      if (activeChannelId && m.channelId === activeChannelId) return true;
      if (activeRecipientId && !m.channelId && m.senderId === activeRecipientId && m.recipientId === currentUser.id) return true;
      return false;
    });

    if (unreadInThread) {
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_READ",
          actorId: currentUser.id,
          channelId: activeChannelId || undefined,
          senderId: activeRecipientId || undefined,
        }),
      }).catch(console.error);
    }
  }, [isOpen, messages, activeChannelId, activeRecipientId, currentUser.id]);

  // Filter messages for current active thread
  const activeMessages = useMemo(() => {
    if (activeRecipientId) {
      return messages.filter(
        (m) =>
          !m.channelId &&
          ((m.senderId === currentUser.id && m.recipientId === activeRecipientId) ||
            (m.senderId === activeRecipientId && m.recipientId === currentUser.id))
      );
    }
    return messages.filter((m) => m.channelId === activeChannelId);
  }, [messages, activeChannelId, activeRecipientId, currentUser.id]);

  // Group other users by hierarchy levels
  const hierarchyDirectory = useMemo(() => {
    const others = users.filter((u) => u.id !== currentUser.id && u.isActive);
    const superAdmins = others.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN");
    const managers = others.filter((u) => u.role.endsWith("_MANAGER"));
    const agents = others.filter((u) => !u.role.endsWith("_MANAGER") && u.role !== "SUPER_ADMIN" && u.role !== "ADMIN");

    return {
      superAdmins,
      managers,
      agents,
    };
  }, [users, currentUser.id]);

  const activeRecipientUser = useMemo(() => {
    return users.find((u) => u.id === activeRecipientId);
  }, [users, activeRecipientId]);

  const activeChannelObj = useMemo(() => {
    return channels.find((c) => c.id === activeChannelId);
  }, [channels, activeChannelId]);

  const selectedLeadObj = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId);
  }, [leads, selectedLeadId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedLeadId) return;

    setIsSending(true);
    try {
      const payload: Record<string, unknown> = {
        actorId: currentUser.id,
        content: inputText.trim() || (messageType === "APPROVAL_REQUEST" ? `Requesting approval for Booking #${selectedLeadObj?.bookingNumber}` : "Referencing booking"),
        messageType,
        channelId: activeRecipientId ? undefined : activeChannelId,
        recipientId: activeRecipientId || undefined,
      };

      if (selectedLeadObj) {
        payload.leadId = selectedLeadObj.id;
        payload.leadBookingNumber = selectedLeadObj.bookingNumber;
        payload.leadPnr = selectedLeadObj.bookingDetails?.pnrCode;
        payload.leadDealValue = selectedLeadObj.salePrice || selectedLeadObj.dealValue;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        setInputText("");
        setMessageType("TEXT");
        setSelectedLeadId("");
        setShowLeadPicker(false);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectChannel = (chId: string) => {
    setActiveChannelId(chId);
    setActiveRecipientId(null);
  };

  const handleSelectDirectMessage = (userId: string) => {
    setActiveRecipientId(userId);
    setActiveChannelId("");
  };

  const canBroadcastHierarchy =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN" ||
    currentUser.role.endsWith("_MANAGER");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4">
      <div
        className={`relative flex flex-col bg-white border border-slate-200 shadow-2xl transition-all duration-200 h-full ${
          isExpanded
            ? "w-full max-w-5xl rounded-none sm:rounded-2xl"
            : "w-full sm:w-[680px] lg:w-[740px] rounded-none sm:rounded-2xl"
        }`}
      >
        {/* Chat Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/90 rounded-t-none sm:rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Kritya Team & Hierarchy Chat</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
                  Live SSE
                </span>
              </h3>
              <p className="text-[10px] text-slate-500">
                Logged in as <strong>{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition hidden sm:inline-flex"
              title={isExpanded ? "Collapse" : "Expand window"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={fetchChatData}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition"
              title="Refresh messages"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition"
              title="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Chat Body: Sidebar + Message Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Channels & Hierarchy Users */}
          <div className="w-52 sm:w-60 border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto">
            {/* Team Channels */}
            <div className="p-3 border-b border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1.5">
                Team Channels
              </span>
              <div className="space-y-0.5">
                {channels.map((ch) => {
                  const isActive = activeChannelId === ch.id && !activeRecipientId;
                  const unreadCount = unreadByChannel[ch.id] || 0;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs font-bold"
                          : unreadCount > 0
                          ? "bg-amber-100/80 text-amber-950 font-bold border border-amber-300 shadow-2xs"
                          : "text-slate-700 hover:bg-slate-200/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Hash className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-indigo-200" : unreadCount > 0 ? "text-amber-600" : "text-slate-400"}`} />
                        <span className="truncate">{ch.name}</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-bold shrink-0 animate-pulse shadow-xs">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Hierarchy Messaging */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {/* Super Admin / Executives */}
              {hierarchyDirectory.superAdmins.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wider font-mono block mb-1 flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Executive Leadership
                  </span>
                  <div className="space-y-0.5">
                    {hierarchyDirectory.superAdmins.map((u) => {
                      const isActive = activeRecipientId === u.id;
                      const unreadCount = unreadBySender[u.id] || 0;
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleSelectDirectMessage(u.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                            isActive
                              ? "bg-purple-600 text-white font-bold shadow-xs"
                              : unreadCount > 0
                              ? "bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-xs ring-1 ring-amber-400"
                              : "text-slate-700 hover:bg-slate-200/60 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {unreadCount > 0 && (
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                            )}
                            <span className="truncate">{u.name.split(" ")[0]} ({u.role.replace(/_/g, " ")})</span>
                          </div>
                          {unreadCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold shrink-0 animate-pulse">
                              {unreadCount} NEW
                            </span>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Department Managers */}
              {hierarchyDirectory.managers.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider font-mono block mb-1 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Department Managers
                  </span>
                  <div className="space-y-0.5">
                    {hierarchyDirectory.managers.map((u) => {
                      const isActive = activeRecipientId === u.id;
                      const unreadCount = unreadBySender[u.id] || 0;
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleSelectDirectMessage(u.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                            isActive
                              ? "bg-indigo-600 text-white font-bold shadow-xs"
                              : unreadCount > 0
                              ? "bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-xs ring-1 ring-amber-400"
                              : "text-slate-700 hover:bg-slate-200/60 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {unreadCount > 0 && (
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                            )}
                            <span className="truncate">{u.name}</span>
                          </div>
                          {unreadCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold shrink-0 animate-pulse">
                              {unreadCount} NEW
                            </span>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Team Specialists & Agents */}
              {hierarchyDirectory.agents.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono block mb-1 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Specialists & Operators
                  </span>
                  <div className="space-y-0.5">
                    {hierarchyDirectory.agents.map((u) => {
                      const isActive = activeRecipientId === u.id;
                      const unreadCount = unreadBySender[u.id] || 0;
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleSelectDirectMessage(u.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                            isActive
                              ? "bg-indigo-600 text-white font-bold shadow-xs"
                              : unreadCount > 0
                              ? "bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-xs ring-1 ring-amber-400"
                              : "text-slate-700 hover:bg-slate-200/60 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {unreadCount > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                            )}
                            <span className="truncate">{u.name}</span>
                          </div>
                          {unreadCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold shrink-0 animate-pulse">
                              {unreadCount} NEW
                            </span>
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Message View */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Thread Sub-Header */}
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  {activeRecipientId ? (
                    <>
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                      Direct Thread with {activeRecipientUser?.name || "Colleague"}
                    </>
                  ) : (
                    <>
                      <Hash className="h-3.5 w-3.5 text-indigo-600" />
                      #{activeChannelObj?.name || "general"}
                    </>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {activeRecipientId
                    ? `${activeRecipientUser?.role} &bull; ${activeRecipientUser?.email}`
                    : activeChannelObj?.description}
                </span>
              </div>

              {activeRecipientUser && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Available
                </span>
              )}
            </div>

            {/* Messages Scroll Feed */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-slate-50/30">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                  <MessageSquare className="h-8 w-8 text-slate-300" />
                  <p className="text-xs font-medium">No messages in this thread yet</p>
                  <p className="text-[11px] text-slate-400">Start the conversation or tag a booking below</p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;
                  const isHierarchy = msg.messageType === "HIERARCHY_UPDATE" || msg.messageType === "SYSTEM_ANNOUNCEMENT";
                  const isEscalation = msg.messageType === "APPROVAL_REQUEST" || msg.messageType === "LEAD_ESCALATION";
                  const isApproved = msg.messageType === "APPROVAL_RESPONSE";
                  const isUnread = !isMine && !(msg.readBy || []).includes(currentUser.id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"} space-y-1`}
                    >
                      {/* Sender Meta Header */}
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        {isMine ? (
                          <span className="font-bold text-slate-800">You</span>
                        ) : isUnread ? (
                          <span className="font-extrabold text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 ring-1 ring-amber-400 shadow-2xs flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                            {msg.senderName}
                            <span className="text-[8px] bg-amber-500 text-white font-bold px-1 rounded">UNREAD</span>
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800">{msg.senderName}</span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                          msg.senderRole === "SUPER_ADMIN" || msg.senderRole === "ADMIN"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : msg.senderRole.endsWith("_MANAGER")
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {msg.senderRole}
                        </span>
                        <span className="text-slate-400">{formatRelativeTime(msg.createdAt)}</span>
                      </div>

                      {/* Bubble Content */}
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-xl text-xs space-y-2 leading-relaxed shadow-2xs ${
                          isHierarchy
                            ? "bg-purple-50 border border-purple-200 text-purple-950 font-medium"
                            : isEscalation
                            ? "bg-amber-50 border border-amber-300 text-amber-950"
                            : isApproved
                            ? "bg-emerald-50 border border-emerald-300 text-emerald-950"
                            : isMine
                            ? "bg-indigo-600 text-white font-normal"
                            : "bg-white border border-slate-200 text-slate-900 font-normal"
                        }`}
                      >
                        {/* Type Banner */}
                        {isHierarchy && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-purple-800 uppercase font-mono pb-1 border-b border-purple-200">
                            <Sparkles className="h-3 w-3" />
                            Hierarchy Announcement
                          </div>
                        )}
                        {isEscalation && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 uppercase font-mono pb-1 border-b border-amber-200">
                            <HelpCircle className="h-3 w-3" />
                            Booking Escalation & Approval Request
                          </div>
                        )}
                        {isApproved && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase font-mono pb-1 border-b border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Manager Approved
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Embedded Lead Reference Card */}
                        {msg.leadBookingNumber && (
                          <div className={`p-2 rounded-lg text-[11px] font-mono flex items-center justify-between gap-2 border ${
                            isMine && !isEscalation && !isApproved
                              ? "bg-indigo-700/70 border-indigo-400/50 text-white"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-amber-600 bg-amber-50 border border-amber-300 px-1 rounded text-[10px]">
                                #{msg.leadBookingNumber}
                              </span>
                              {msg.leadPnr && <span>PNR: {msg.leadPnr}</span>}
                            </div>

                            {onOpenLeadWorkspace && msg.leadId && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetLead = leads.find((l) => l.id === msg.leadId || l.bookingNumber === msg.leadBookingNumber);
                                  if (targetLead) onOpenLeadWorkspace(targetLead);
                                }}
                                className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition shrink-0 cursor-pointer"
                              >
                                View Workspace &rarr;
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="px-3 py-1.5 border-t border-slate-200 bg-slate-50/90 flex items-center gap-1.5 overflow-x-auto text-[10px]">
              <span className="font-mono text-slate-500 font-bold shrink-0">Quick Action:</span>
              <button
                type="button"
                onClick={() => {
                  setMessageType("APPROVAL_REQUEST");
                  setShowLeadPicker(true);
                }}
                className={`px-2 py-0.5 rounded border font-semibold transition shrink-0 cursor-pointer ${
                  messageType === "APPROVAL_REQUEST"
                    ? "bg-amber-100 text-amber-900 border-amber-400 font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ⚡ Request Manager Approval
              </button>

              <button
                type="button"
                onClick={() => setShowLeadPicker(!showLeadPicker)}
                className={`px-2 py-0.5 rounded border font-semibold transition shrink-0 cursor-pointer ${
                  selectedLeadId
                    ? "bg-indigo-100 text-indigo-900 border-indigo-300 font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🔖 {selectedLeadId ? `Attached #${selectedLeadObj?.bookingNumber}` : "Tag Booking #"}
              </button>

              {canBroadcastHierarchy && (
                <button
                  type="button"
                  onClick={() => setMessageType(messageType === "HIERARCHY_UPDATE" ? "TEXT" : "HIERARCHY_UPDATE")}
                  className={`px-2 py-0.5 rounded border font-semibold transition shrink-0 cursor-pointer ${
                    messageType === "HIERARCHY_UPDATE"
                      ? "bg-purple-100 text-purple-900 border-purple-400 font-bold"
                      : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
                  }`}
                >
                  📢 Hierarchy Broadcast
                </button>
              )}
            </div>

            {/* Lead Tagging Dropdown Picker */}
            {showLeadPicker && (
              <div className="p-2 border-t border-indigo-200 bg-indigo-50/70 flex items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-indigo-900 font-mono shrink-0">Select Booking:</span>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="bg-white border border-indigo-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none flex-1"
                >
                  <option value="">-- Choose active booking inquiry --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      #{l.bookingNumber} &bull; {l.name} &bull; {l.bookingDetails?.origin} &rarr; {l.bookingDetails?.destination} (${l.dealValue || l.ticketPrice})
                    </option>
                  ))}
                </select>
                {selectedLeadId && (
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId("")}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Composer Box */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeRecipientId
                    ? `Message ${activeRecipientUser?.name} (${activeRecipientUser?.role})...`
                    : `Message #${activeChannelObj?.name}...`
                }
                className="flex-1 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !selectedLeadId)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? "Sending..." : "Send"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
