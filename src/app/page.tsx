"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, Lead, Transaction, Customer, Ticket, AuditLog, ActivityLog, LeadStatus, TicketStatus } from "@/types";
import { Navbar } from "@/components/layout/Navbar";
import { SalesView } from "@/components/dashboard/SalesView";
import { ChargingView } from "@/components/dashboard/ChargingView";
import { CSView } from "@/components/dashboard/CSView";
import { SuperAdminView } from "@/components/dashboard/SuperAdminView";
import { LeadIngestionModal } from "@/components/leads/LeadIngestionModal";
import { LeadWorkspaceModal } from "@/components/leads/LeadWorkspaceModal";
import { CreateUserModal } from "@/components/users/CreateUserModal";

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>("sales");

  // Domain states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Split-pane & Full Workspace Modal
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(undefined);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // SSE & Realtime
  const [isConnected, setIsConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  // Fetch all domain data & users
  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, chargingRes, ticketsRes, auditRes, usersRes] = await Promise.all([
        fetch(`/api/leads?role=${currentUser?.role || ""}&userId=${currentUser?.id || ""}`).then((r) => r.json()),
        fetch("/api/charging").then((r) => r.json()),
        fetch("/api/tickets").then((r) => r.json()),
        fetch("/api/audit-logs").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
      ]);

      if (leadsRes.success) {
        setLeads(leadsRes.leads);
        if (!selectedLeadId && leadsRes.leads.length > 0) {
          setSelectedLeadId(leadsRes.leads[0].id);
        }
      }
      if (chargingRes.success) setTransactions(chargingRes.transactions);
      if (ticketsRes.success) {
        setTickets(ticketsRes.tickets);
        setCustomers(ticketsRes.customers);
      }
      if (auditRes.success) {
        setAuditLogs(auditRes.auditLogs);
        setActivityLogs(auditRes.activityLogs);
      }
      if (usersRes.success && Array.isArray(usersRes.users)) {
        setUsers(usersRes.users);
        if (!currentUser && usersRes.users.length > 0) {
          setCurrentUser(usersRes.users[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load CRM data:", err);
    }
  }, [currentUser, selectedLeadId]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Role-based view protection
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "SALES_AGENT") {
        setActiveView("sales");
      } else if (currentUser.role === "CS_AGENT") {
        setActiveView("cs");
      } else if (currentUser.role === "CHARGING_OPERATOR") {
        setActiveView("charging");
      }
    }
  }, [currentUser]);

  // Search booking ID in persistent database
  const handleSearchBookingId = async (bookingId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(
        `/api/leads/search?bookingId=${encodeURIComponent(
          bookingId
        )}&role=${currentUser.role}&userId=${currentUser.id}`
      );
      const data = await res.json();
      if (data.success && data.lead) {
        setSelectedLeadId(data.lead.id);
        setIsWorkspaceModalOpen(true);
        setActiveView("sales");
      } else {
        alert(data.error || "Booking ID not found in database.");
      }
    } catch (err) {
      console.error("Booking search failed:", err);
      alert("Failed to search booking in database.");
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // Connect to SSE Real-time pipeline
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/events");

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type !== "CONNECTED") {
            setEventCount((prev) => prev + 1);
            fetchData();
          }
        } catch {
          // ignore keepalive
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [fetchData]);

  // Lead state machine transition
  const handleTransitionLead = async (leadId: string, targetStatus: LeadStatus) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("State Transition Denied by RBAC: " + data.error);
      } else {
        await fetchData();
      }
    } catch (err) {
      console.error("Transition failed:", err);
    }
  };

  // Transaction settlement action
  const handleProcessTransaction = async (
    txnId: string,
    action: "CAPTURE" | "DECLINE",
    options?: { failureReason?: string }
  ) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/charging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: txnId,
          action,
          actorId: currentUser.id,
          options,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert("Charging operation failed: " + data.error);
      }
    } catch (err) {
      console.error("Charging failed:", err);
    }
  };

  // Ticket status update
  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status,
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error("Ticket update failed:", err);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500 font-mono text-xs">
        Initializing Enterprise CRM Engine...
      </div>
    );
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0] || null;
  const leadActivity = selectedLead ? activityLogs.filter((l) => l.entityId === selectedLead.id) : [];

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 xl:h-screen xl:overflow-hidden">
      {/* Top Navigation & Live Role Simulator */}
      <Navbar
        currentUser={currentUser}
        users={users}
        onSelectUser={(u) => setCurrentUser(u)}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
        onOpenCreateUserModal={() => setIsCreateUserModalOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        onSearchBookingId={handleSearchBookingId}
        isConnected={isConnected}
        eventCount={eventCount}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 xl:overflow-hidden">
        {activeView === "sales" && (
          <div className="flex-1 flex flex-col min-w-0 xl:overflow-hidden">
            <SalesView
              leads={leads}
              currentUser={currentUser}
              users={users}
              onSelectLead={(l) => {
                setSelectedLeadId(l.id);
                setIsWorkspaceModalOpen(true);
              }}
              selectedLeadId={selectedLeadId}
              onOpenIngestModal={() => setIsIngestModalOpen(true)}
              onTransitionLead={(id, st) => handleTransitionLead(id, st)}
              onRefresh={fetchData}
            />
          </div>
        )}

        {activeView === "charging" && (
          <ChargingView
            transactions={transactions}
            leads={leads}
            currentUser={currentUser}
            onProcessTransaction={handleProcessTransaction}
            onRefresh={fetchData}
          />
        )}

        {activeView === "cs" && (
          <CSView
            tickets={tickets}
            customers={customers}
            currentUser={currentUser}
            onUpdateTicketStatus={handleUpdateTicketStatus}
          />
        )}

        {activeView === "admin" && (
          <SuperAdminView
            auditLogs={auditLogs}
            activityLogs={activityLogs}
            users={users}
            currentUser={currentUser}
            onRefreshUsers={fetchData}
          />
        )}
      </main>

      {/* FULL-WINDOW WORKSPACE MODAL FOR AGENTS */}
      <LeadWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        lead={selectedLead}
        currentUser={currentUser}
        users={users}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onTransition={handleTransitionLead}
        onRefresh={fetchData}
        activityLogs={leadActivity}
      />

      {/* Modal: Lead Ingestion Webhook / Simulation Engine */}
      <LeadIngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Modal: Role Hierarchy User Creation Panel */}
      {isCreateUserModalOpen && (
        <CreateUserModal
          isOpen={isCreateUserModalOpen}
          currentUser={currentUser}
          onClose={() => setIsCreateUserModalOpen(false)}
          onSuccess={async () => {
            await fetchData();
          }}
        />
      )}
    </div>
  );
}
