"use client";

import React, { useState, useMemo } from "react";
import { AuditLog, ActivityLog, User, Role } from "@/types";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import {
  getAllowedCreatableRoles,
  ROLE_HIERARCHY_CONFIG,
  ROLE_DEPARTMENT_MAP,
  canCreateUserRole,
} from "@/lib/rbac";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import {
  ShieldAlert,
  Server,
  Users,
  Activity,
  Code2,
  Lock,
  Globe,
  Database,
  Terminal,
  CheckCircle2,
  Cpu,
  UserPlus,
  Search,
  Trash2,
  Crown,
  Shield,
  Briefcase,
  UserCheck,
  Building,
  Layers,
  ChevronRight,
  Filter,
} from "lucide-react";

interface SuperAdminViewProps {
  auditLogs: AuditLog[];
  activityLogs: ActivityLog[];
  users: User[];
  currentUser: User;
  onRefreshUsers?: () => Promise<void> | void;
}

export function SuperAdminView({
  auditLogs,
  activityLogs,
  users,
  currentUser,
  onRefreshUsers,
}: SuperAdminViewProps) {
  const [activeTab, setActiveTab] = useState<"audit" | "team" | "api" | "tenant">("team");
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(
    auditLogs[0] || null
  );

  // User Management filters
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";
  const allowedCreatableRoles = getAllowedCreatableRoles(currentUser.role);
  const canCreateAny = allowedCreatableRoles.length > 0;

  // Organizational Hierarchy Counts
  const superAdminCount = users.filter((u) => u.role === "SUPER_ADMIN").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const managerCount = users.filter((u) => u.role.endsWith("_MANAGER")).length;
  const agentCount = users.filter((u) => u.role.endsWith("_AGENT") || u.role.endsWith("_OPERATOR")).length;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (userRoleFilter === "ADMINS" && !(u.role === "SUPER_ADMIN" || u.role === "ADMIN")) {
        return false;
      }
      if (userRoleFilter === "MANAGERS" && !u.role.endsWith("_MANAGER")) {
        return false;
      }
      if (userRoleFilter === "AGENTS" && !(u.role.endsWith("_AGENT") || u.role.endsWith("_OPERATOR"))) {
        return false;
      }
      if (userRoleFilter !== "ALL" && userRoleFilter !== "ADMINS" && userRoleFilter !== "MANAGERS" && userRoleFilter !== "AGENTS" && u.role !== userRoleFilter) {
        return false;
      }

      // Search filter
      const q = userSearchQuery.toLowerCase().trim().replace(/^@/, "");
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.departmentId && u.departmentId.toLowerCase().includes(q))
      );
    });
  }, [users, userRoleFilter, userSearchQuery]);

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      alert("You cannot delete your own session account.");
      return;
    }

    const check = canCreateUserRole(currentUser.role, targetUser.role);
    if (!check.allowed && currentUser.role !== "SUPER_ADMIN") {
      alert(`Hierarchy Restriction: Your role '${currentUser.role}' is not authorized to delete '${targetUser.role}'.`);
      return;
    }

    if (!confirm(`Are you sure you want to remove user '${targetUser.name}' (${targetUser.role}) from Travelocase Enterprise?`)) {
      return;
    }

    setDeletingUserId(targetUser.id);
    try {
      const res = await fetch(`/api/users?userId=${targetUser.id}&actorId=${currentUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (onRefreshUsers) await onRefreshUsers();
      } else {
        alert(data.error || "Failed to delete user.");
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
      {/* Top Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Super Admin & Organizational Control Panel
            </h2>
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Travelocase Enterprise (tenant_travelocase)
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Role hierarchy enforcement, multi-tier user creation, and enterprise compliance audit trail.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 text-xs overflow-x-auto max-w-full pb-0.5 sm:pb-0">
          <button
            onClick={() => setActiveTab("team")}
            className={`px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === "team"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>User Hierarchy & Matrix ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === "api"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>API Ingress</span>
          </button>
          <button
            onClick={() => setActiveTab("tenant")}
            className={`px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === "tenant"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Tenant Config</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: USERS & ORGANIZATIONAL HIERARCHY MATRIX */}
        {/* ========================================================================= */}
        {activeTab === "team" && (
          <div className="space-y-4">
            {/* 1. Hierarchy Level Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 text-xs">
              {/* Level 1: Super Admin */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-purple-200 relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-purple-700 uppercase tracking-wider">
                    Level 1 &bull; Super Admin
                  </span>
                  <Crown className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5">
                  {superAdminCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Full Authority &bull; Creates All Roles
                </div>
              </div>

              {/* Level 2: Operations Admin */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-indigo-200 relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-indigo-700 uppercase tracking-wider">
                    Level 2 &bull; Operations Admin
                  </span>
                  <Shield className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5">
                  {adminCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Creates Managers & Agents
                </div>
              </div>

              {/* Level 3: Department Managers */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-cyan-200 relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-cyan-700 uppercase tracking-wider">
                    Level 3 &bull; Dept Managers
                  </span>
                  <Briefcase className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5">
                  {managerCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Creates Department Agents
                </div>
              </div>

              {/* Level 4: Operational Agents & Operators */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-emerald-200 relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                    Level 4 &bull; Agents / Ops
                  </span>
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5">
                  {agentCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Individual Contributors
                </div>
              </div>
            </div>

            {/* 2. Hierarchy Action Toolbar & Search */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user name, email, role, department..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition"
                />
              </div>

              {/* Role filter buttons */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 md:pb-0 text-xs">
                {[
                  { id: "ALL", label: "All Users" },
                  { id: "ADMINS", label: "Admins" },
                  { id: "MANAGERS", label: "Managers" },
                  { id: "AGENTS", label: "Agents & Ops" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setUserRoleFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                      userRoleFilter === f.id
                        ? "bg-purple-600 text-white font-bold shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Create User Button */}
              {canCreateAny && (
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm shadow-purple-500/20 transition flex items-center gap-1.5 shrink-0 self-end md:self-auto active:scale-95"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Create User / Operator</span>
                </button>
              )}
            </div>

            {/* 3. Organizational User Matrix Table */}
            <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Active User Roster & Role Permissions ({filteredUsers.length} Users)
                </span>
                <span className="text-[10px] font-mono text-purple-700 font-semibold">
                  Creator Role: {currentUser.role}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">User & Profile</th>
                      <th className="py-2.5 px-3">System Role & Hierarchy</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Department Scope</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Created Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No users match the search or role filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const meta = ROLE_HIERARCHY_CONFIG[u.role];
                        const canDeleteThisUser =
                          u.id !== currentUser.id &&
                          (currentUser.role === "SUPER_ADMIN" || canCreateUserRole(currentUser.role, u.role).allowed);

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition">
                            {/* Avatar & Name */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                                  alt={u.name}
                                  className="h-7 w-7 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                    <span className="truncate">{u.name}</span>
                                    {u.username && (
                                      <span className="text-[10px] font-mono text-indigo-700 font-normal">
                                        @{u.username}
                                      </span>
                                    )}
                                    {u.id === currentUser.id && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500 truncate">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* System Role Badge */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                    meta?.level === 1
                                      ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                                      : meta?.level === 2
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold"
                                      : meta?.level === 3
                                      ? "bg-cyan-50 text-cyan-800 border-cyan-200 font-bold"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
                                  }`}
                                >
                                  {u.role}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 hidden lg:inline">
                                  L{meta?.level || 4}
                                </span>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px] hidden sm:table-cell">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                {u.departmentId || "Global Root"}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                                  u.isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                {u.isActive ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </td>

                            {/* Joined Date */}
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] hidden md:table-cell">
                              {formatDate(u.createdAt)}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-3 text-right">
                              {canDeleteThisUser ? (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={deletingUserId === u.id}
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition disabled:opacity-50"
                                  title="Delete User (Hierarchy Permitted)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono italic">
                                  Protected
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AUDIT LOGS */}
        {/* ========================================================================= */}
        {activeTab === "audit" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Audit Log Table */}
            <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-purple-600" />
                  Immutable Platform Audit Logs (Row-Level Security)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Live Stream</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Actor & Role</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Target Resource</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">IP Address</th>
                      <th className="py-2.5 px-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => {
                      const isSelected = log.id === selectedAuditLog?.id;
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedAuditLog(log)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-purple-50/80 border-l-2 border-purple-600" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800">{log.actorEmail}</span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-purple-700 font-medium">
                            {log.action}
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10px] hidden sm:table-cell">
                            {log.resource}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 hidden md:table-cell">
                            {log.ipAddress}
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10px] text-right">
                            {formatRelativeTime(log.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Audit Log JSON Payload Inspector */}
            <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-3 sm:p-4 space-y-3">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-purple-600" />
                Audit Event JSON Payload
              </span>

              {selectedAuditLog ? (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase">Action:</span>{" "}
                      <span className="font-mono text-purple-700 font-semibold">{selectedAuditLog.action}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase">Actor:</span>{" "}
                      <span className="font-mono text-slate-800">{selectedAuditLog.actorEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase">Resource:</span>{" "}
                      <span className="font-mono text-slate-600">{selectedAuditLog.resource}</span>
                    </div>
                  </div>

                  <pre className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-800 overflow-x-auto max-h-80">
                    {JSON.stringify(selectedAuditLog.payload || selectedAuditLog, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-6 text-center">Select an audit event.</div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: API INGRESS */}
        {/* ========================================================================= */}
        {activeTab === "api" && (
          <div className="p-4 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4 max-w-2xl">
            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-purple-600" />
              Webhook Ingress & Cryptographic Authentication
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Post JSON payloads to <code className="text-indigo-600 font-mono font-medium">/api/leads</code> with HMAC-SHA256 signature verification headers. Ingested records automatically execute SPF/DKIM validation and populate row-level digital footprint telemetry.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
              <div><strong>Endpoint:</strong> POST /api/leads</div>
              <div><strong>Header:</strong> X-Signature-SHA256: &lt;computed_hmac&gt;</div>
              <div><strong>Payload:</strong> Flight Itinerary, Passenger Roster, Masked Card Vault</div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TENANT CONFIG */}
        {/* ========================================================================= */}
        {activeTab === "tenant" && (
          <div className="p-4 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4 max-w-2xl">
            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              Enterprise Tenant Configuration (Travelocase)
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono uppercase text-[10px]">Tenant ID</span>
                <p className="font-semibold text-slate-900 mt-0.5">tenant_travelocase</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono uppercase text-[10px]">Sender Email</span>
                <p className="font-semibold text-indigo-600 mt-0.5">ticketing@travelocase.com</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono uppercase text-[10px]">Data Storage</span>
                <p className="font-semibold text-emerald-700 mt-0.5">File-backed JSON DB (Persistent)</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-mono uppercase text-[10px]">Compliance</span>
                <p className="font-semibold text-purple-700 mt-0.5">PCI Vault Tokenized</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Create User Modal */}
      {isCreateUserModalOpen && (
        <CreateUserModal
          isOpen={isCreateUserModalOpen}
          currentUser={currentUser}
          onClose={() => setIsCreateUserModalOpen(false)}
          onSuccess={async () => {
            if (onRefreshUsers) await onRefreshUsers();
          }}
        />
      )}
    </div>
  );
}
