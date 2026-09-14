"use client";

import React, { useState, useEffect } from "react";
import { User, Role } from "@/types";
import {
  getAllowedCreatableRoles,
  ROLE_HIERARCHY_CONFIG,
  ROLE_DEPARTMENT_MAP,
} from "@/lib/rbac";
import {
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
  Sparkles,
  Building,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowRight,
} from "lucide-react";

interface CreateUserModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const AVATAR_PRESETS = [
  { id: "av1", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80", label: "Executive Female" },
  { id: "av2", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80", label: "Executive Male" },
  { id: "av3", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80", label: "Specialist Female" },
  { id: "av4", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80", label: "Agent Male" },
  { id: "av5", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80", label: "Director Female" },
  { id: "av6", url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80", label: "Operator Male" },
  { id: "av7", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80", label: "Admin Female" },
  { id: "av8", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80", label: "Concierge Male" },
];

export function CreateUserModal({
  isOpen,
  currentUser,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const allowedRoles = getAllowedCreatableRoles(currentUser.role);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(allowedRoles[0] || "SALES_AGENT");
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0].url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Set default role when modal opens or user changes
  useEffect(() => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      setRole(allowedRoles[0]);
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const roleMeta = ROLE_HIERARCHY_CONFIG[role];
  const deptType = ROLE_DEPARTMENT_MAP[role] || "ADMIN";
  const isAgentRole =
    role === "SALES_AGENT" ||
    role === "CHARGING_OPERATOR" ||
    role === "CS_AGENT";

  const handleNameChange = (val: string) => {
    setName(val);
    const sanitized = val.toLowerCase().replace(/[^a-z0-9]/g, ".");
    // Auto-suggest username if empty or untouched
    if (!username || username.includes(".")) {
      if (sanitized) {
        setUsername(sanitized);
        if (!email || email.includes("@travelocase.com")) {
          setEmail(`${sanitized}@travelocase.com`);
        }
      }
    }
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._-]/g, "");
    setUsername(clean);
    if (isAgentRole && (!email || email.includes("@travelocase.com"))) {
      setEmail(clean ? `${clean}@travelocase.com` : "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentUser.id,
          name: name.trim(),
          username: cleanUsername,
          email: email.trim().toLowerCase() || (isAgentRole ? `${cleanUsername}@travelocase.com` : undefined),
          role,
          avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to create user.");
        return;
      }

      setSuccessMessage(data.message || `User '${data.user?.name}' (@${data.user?.username}) created successfully!`);
      setName("");
      setUsername("");
      setEmail("");
      await onSuccess();

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 sm:p-6 text-slate-900 max-h-[96vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                Create User & Onboard Operator
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600">
                Agents created with unique Username. Admins & Managers require Email + Username.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Creator Authority Banner */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Creator Authority:</div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {currentUser.role}
                </span>
                {currentUser.username && (
                  <span className="font-mono text-[10px] text-slate-500">
                    @{currentUser.username}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-600 font-mono">
            {currentUser.role === "SUPER_ADMIN" && (
              <span className="text-purple-700 font-semibold">Hierarchy: Can create Admins, Managers & Agents</span>
            )}
            {currentUser.role === "ADMIN" && (
              <span className="text-indigo-700 font-semibold">Hierarchy: Can create Managers & Agents</span>
            )}
            {currentUser.role.endsWith("_MANAGER") && (
              <span className="text-cyan-700 font-semibold">Hierarchy: Can create Agents for your department</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* System Role Dropdown (Strictly filtered based on hierarchy) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-indigo-600" />
                Target System Role (Permitted by Hierarchy):
              </span>
              <span className="text-[10px] font-mono text-indigo-700 font-semibold">
                {allowedRoles.length} Roles Authorized
              </span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {allowedRoles.map((r) => {
                const meta = ROLE_HIERARCHY_CONFIG[r];
                return (
                  <option key={r} value={r} className="bg-white text-slate-800 py-1">
                    {meta ? `${meta.title} (${r}) - Level ${meta.level}` : r}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Role Specification Notice */}
          <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            isAgentRole 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-purple-50 border-purple-200 text-purple-800"
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-[11px] leading-tight">
                {isAgentRole 
                  ? "Agent Account: Registered primarily with unique @username. Email auto-derives from @travelocase.com."
                  : "Executive Admin / Manager Account: Both Enterprise Corporate Email AND unique @username are mandatory."}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 shrink-0 font-semibold">
              {isAgentRole ? "Username-Driven" : "Email + Username"}
            </span>
          </div>

          {/* Grid Layout for Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserIcon className="h-3.5 w-3.5 text-indigo-600" />
                Full Name <span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                placeholder="e.g. Alexander Vance"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="text-indigo-600 font-mono font-bold">@</span>
                  {isAgentRole ? "Agent Username (Primary)" : "System Username"} <span className="text-red-500">*</span>:
                </span>
                <span className="text-[10px] font-mono text-indigo-700 font-semibold">
                  {isAgentRole ? "Identifier" : "Required"}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  placeholder="e.g. alexander.v"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  className="w-full rounded-lg bg-white border border-slate-300 pl-7 pr-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-indigo-600" />
                  Enterprise Corporate Email: {!isAgentRole && <span className="text-red-500">*</span>}
                </span>
                {isAgentRole ? (
                  <span className="text-[10px] font-mono text-slate-500">
                    Auto-generated from username
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-purple-700 font-semibold">
                    Mandatory for Admins/Managers
                  </span>
                )}
              </label>
              <input
                type="email"
                placeholder={isAgentRole ? `${username || "agent"}@travelocase.com` : "e.g. alexander.v@travelocase.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!isAgentRole}
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Role Preview Card & Department Badge */}
          {roleMeta && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-indigo-700">{roleMeta.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                    Hierarchy Level {roleMeta.level}
                  </span>
                </div>
                <div className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1 font-semibold">
                  <Building className="h-3 w-3" />
                  <span>Dept: {deptType} ({roleMeta.departmentId})</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">{roleMeta.description}</p>
            </div>
          )}

          {/* Avatar Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Select Profile Avatar:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {AVATAR_PRESETS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setAvatarUrl(av.url)}
                  className={`relative rounded-full p-0.5 transition shrink-0 ${
                    avatarUrl === av.url
                      ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white scale-105"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  title={av.label}
                >
                  <img
                    src={av.url}
                    alt={av.label}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || allowedRoles.length === 0}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Creating User...</span>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Create User Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
