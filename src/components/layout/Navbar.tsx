"use client";

import React, { useState } from "react";
import { User, Role } from "@/types";
import { ROLE_PERMISSIONS, ROLE_DEPARTMENT_MAP, getAllowedCreatableRoles } from "@/lib/rbac";
import {
  ShieldCheck,
  Zap,
  PlusCircle,
  Activity,
  Layers,
  Sparkles,
  Server,
  Menu,
  X,
  Plane,
  CreditCard,
  LifeBuoy,
  ShieldAlert,
  Search,
  Lock,
  UserPlus,
} from "lucide-react";

interface NavbarProps {
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
  onOpenIngestModal: () => void;
  onOpenCreateUserModal?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onSearchBookingId?: (bookingId: string) => void;
  isConnected: boolean;
  eventCount: number;
}

export function Navbar({
  currentUser,
  users,
  onSelectUser,
  onOpenIngestModal,
  onOpenCreateUserModal,
  activeView,
  setActiveView,
  onSearchBookingId,
  isConnected,
  eventCount,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingIdQuery, setBookingIdQuery] = useState("");
  const isSalesAgent = currentUser.role === "SALES_AGENT";
  const isCsAgent = currentUser.role === "CS_AGENT";
  const isChargingOperator = currentUser.role === "CHARGING_OPERATOR";
  const isManagerOrAdmin =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN" ||
    currentUser.role.endsWith("_MANAGER");

  const allowedCreatableRoles = getAllowedCreatableRoles(currentUser.role);
  const canCreateUsers = allowedCreatableRoles.length > 0;

  const handleNavClick = (view: string) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const handleBookingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingIdQuery.trim() && onSearchBookingId) {
      onSearchBookingId(bookingIdQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile menu toggle (only for roles that have multiple views) */}
          {isManagerOrAdmin && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-md shadow-indigo-500/20">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-slate-900 text-sm font-sans">Kritya</span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Travelocase
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-4 w-px bg-slate-200 mx-1" />

          {/* Role-Restricted Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Sales Pipeline: Visible to Sales Agent, Managers, Admins */}
            {(!isCsAgent && !isChargingOperator) && (
              <button
                onClick={() => handleNavClick("sales")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "sales"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Plane className="h-3.5 w-3.5" />
                <span>{isSalesAgent ? "My Assigned Bookings" : "Sales Pipeline"}</span>
              </button>
            )}

            {/* Charging & Finance: Hidden for Sales Agent & CS Agent */}
            {(isManagerOrAdmin || isChargingOperator) && (
              <button
                onClick={() => handleNavClick("charging")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "charging"
                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Charging & Finance</span>
              </button>
            )}

            {/* Customer Service: Hidden for Sales Agent & Charging Ops */}
            {(isManagerOrAdmin || isCsAgent) && (
              <button
                onClick={() => handleNavClick("cs")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "cs"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>Customer Service (SLA)</span>
              </button>
            )}

            {/* Super Admin & Audit: Only for Admins */}
            {(currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") && (
              <button
                onClick={() => handleNavClick("admin")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "admin"
                    ? "bg-purple-50 text-purple-700 border border-purple-200 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Super Admin & Audit</span>
              </button>
            )}
          </nav>
        </div>

        {/* Center: Booking ID Quick Search Bar */}
        <form onSubmit={handleBookingSearch} className="hidden md:flex items-center relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search Booking # / PNR (e.g. 1001)..."
            value={bookingIdQuery}
            onChange={(e) => setBookingIdQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-16 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-mono transition"
          />
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono hover:bg-indigo-100 transition"
          >
            Find
          </button>
        </form>

        {/* Right Controls: Ingest Lead, Realtime SSE Status, Role Simulator */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Live Pipeline SSE pulse */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] sm:text-[11px] text-slate-600 font-mono shrink-0">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <span className="hidden md:inline">{isConnected ? "LIVE SSE" : "OFFLINE"}</span>
            {eventCount > 0 && (
              <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1 py-0.2 rounded-full border border-indigo-200">
                {eventCount}
              </span>
            )}
          </div>

          {/* Ingest Lead button (Visible for Managers and Admins) */}
          {isManagerOrAdmin && (
            <button
              onClick={onOpenIngestModal}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-sm shadow-indigo-500/25 transition border border-indigo-400/30 active:scale-95 shrink-0"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ingest Booking</span>
              <span className="sm:hidden">Ingest</span>
            </button>
          )}

          {/* Onboard User / Create Agent Button (Visible for Super Admin, Admin, and Department Managers) */}
          {canCreateUsers && onOpenCreateUserModal && (
            <button
              onClick={onOpenCreateUserModal}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-xs transition active:scale-95 shrink-0"
              title={
                currentUser.role === "SUPER_ADMIN"
                  ? "Create Admins, Managers, and Agents"
                  : currentUser.role === "ADMIN"
                  ? "Create Managers and Agents"
                  : `Create ${currentUser.role.replace("_MANAGER", "")} Agents`
              }
            >
              <UserPlus className="h-3.5 w-3.5 text-purple-600" />
              <span className="hidden sm:inline">
                {currentUser.role.endsWith("_MANAGER") ? "+ Add Agent" : "+ Create User"}
              </span>
              <span className="sm:hidden">+ User</span>
            </button>
          )}

          {/* Role Simulator Switcher */}
          <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-200">
            <div className="text-right hidden xl:block">
              <div className="text-xs font-medium text-slate-800 flex items-center justify-end gap-1">
                <span className="truncate max-w-[120px]">{currentUser.name}</span>
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                {currentUser.role}
              </div>
            </div>

            <div className="relative">
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = users.find((u) => u.id === e.target.value);
                  if (selected) onSelectUser(selected);
                }}
                className="bg-white text-[11px] sm:text-xs text-slate-800 border border-slate-300 rounded-lg px-2 py-1.5 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none font-medium hover:border-slate-400 transition max-w-[135px] sm:max-w-[190px] truncate"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-white text-slate-800 py-1">
                    {u.role}: {u.name} {u.username ? `(@${u.username})` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Navigation Dropdown (Only for Managers/Admins with multiple views) */}
      {mobileMenuOpen && isManagerOrAdmin && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 p-3 space-y-1 animate-in slide-in-from-top-2 duration-200 shadow-md">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-2 py-1">
            Department Views
          </div>
          <button
            onClick={() => handleNavClick("sales")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeView === "sales"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Plane className="h-4 w-4 text-indigo-600" />
            <span>Sales Pipeline & Bookings</span>
          </button>

          <button
            onClick={() => handleNavClick("charging")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeView === "charging"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="h-4 w-4 text-cyan-600" />
            <span>Charging, Ticketing & Finance</span>
          </button>

          <button
            onClick={() => handleNavClick("cs")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeView === "cs"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <LifeBuoy className="h-4 w-4 text-emerald-600" />
            <span>Customer Service Concierge (SLA)</span>
          </button>

          {(currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") && (
            <button
              onClick={() => handleNavClick("admin")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeView === "admin"
                  ? "bg-purple-50 text-purple-700 border border-purple-200 font-bold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-purple-600" />
              <span>Super Admin & Audit Trail</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
