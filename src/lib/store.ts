import fs from "fs";
import path from "path";
import {
  User,
  Lead,
  Transaction,
  Customer,
  Ticket,
  ActivityLog,
  AuditLog,
  LeadStatus,
  TransactionStatus,
  TicketStatus,
  Role,
  FlightBooking,
  CardDetails,
} from "@/types";
import {
  INITIAL_USERS,
  INITIAL_LEADS,
  INITIAL_TRANSACTIONS,
  INITIAL_CUSTOMERS,
  INITIAL_TICKETS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_AUDIT_LOGS,
} from "./mock-data";
import { canTransitionLead, canCreateUserRole, ROLE_DEPARTMENT_MAP } from "./rbac";
import { evaluateSenderAuthenticity } from "./verification";
import { broadcastEvent } from "./event-bus";
import {
  PREDEFINED_EMAIL_TEMPLATES,
  renderEmailTemplate,
  OFFICIAL_SENDER_EMAIL,
} from "./templates";

interface DatabaseSnapshot {
  users: User[];
  leads: Lead[];
  transactions: Transaction[];
  customers: Customer[];
  tickets: Ticket[];
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
  roundRobinIndex: number;
  lastBookingNumber?: number;
  lastPersistedAt: string;
}

// Persistent Enterprise CRM Store with file-backed Database Engine
class EnterpriseCRMStore {
  private users: User[] = [...INITIAL_USERS];
  private leads: Lead[] = JSON.parse(JSON.stringify(INITIAL_LEADS));
  private transactions: Transaction[] = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
  private customers: Customer[] = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS));
  private tickets: Ticket[] = JSON.parse(JSON.stringify(INITIAL_TICKETS));
  private activityLogs: ActivityLog[] = JSON.parse(JSON.stringify(INITIAL_ACTIVITY_LOGS));
  private auditLogs: AuditLog[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
  private roundRobinIndex = 0;
  private lastBookingNumber = 1005;

  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), "data", "kritya_crm_db.json");
    this.initDatabase();
  }

  // ----------------------------------------------------
  // Persistent Database Lifecycle
  // ----------------------------------------------------
  private initDatabase() {
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, "utf-8");
        const parsed = JSON.parse(raw) as Partial<DatabaseSnapshot>;
        if (parsed.leads && Array.isArray(parsed.leads)) this.leads = parsed.leads;
        if (parsed.transactions && Array.isArray(parsed.transactions)) this.transactions = parsed.transactions;
        if (parsed.customers && Array.isArray(parsed.customers)) this.customers = parsed.customers;
        if (parsed.tickets && Array.isArray(parsed.tickets)) this.tickets = parsed.tickets;
        if (parsed.activityLogs && Array.isArray(parsed.activityLogs)) this.activityLogs = parsed.activityLogs;
        if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) this.auditLogs = parsed.auditLogs;
        if (parsed.users && Array.isArray(parsed.users)) this.users = parsed.users;
        if (typeof parsed.roundRobinIndex === "number") this.roundRobinIndex = parsed.roundRobinIndex;
        if (typeof parsed.lastBookingNumber === "number") {
          this.lastBookingNumber = parsed.lastBookingNumber;
        }
      }

      // Ensure all loaded users have username backfilled
      this.users.forEach((u) => {
        if (!u.username) {
          u.username = u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
        }
      });

      // Ensure all loaded leads have sequential bookingNumber and bookingId backfilled
      let maxBookingNum = typeof this.lastBookingNumber === "number" ? this.lastBookingNumber : 1000;
      this.leads.forEach((l) => {
        if (!l.bookingNumber) {
          maxBookingNum++;
          l.bookingNumber = maxBookingNum;
          l.bookingId = `#${maxBookingNum}`;
        } else {
          if (!l.bookingId) {
            l.bookingId = `#${l.bookingNumber}`;
          }
          if (l.bookingNumber > maxBookingNum) {
            maxBookingNum = l.bookingNumber;
          }
        }
      });
      this.lastBookingNumber = Math.max(maxBookingNum, 1000);

      this.saveToDatabase();
    } catch (err) {
      console.error("Failed to initialize or read CRM Database file:", err);
    }
  }

  public saveToDatabase() {
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const snapshot: DatabaseSnapshot = {
        users: this.users,
        leads: this.leads,
        transactions: this.transactions,
        customers: this.customers,
        tickets: this.tickets,
        activityLogs: this.activityLogs,
        auditLogs: this.auditLogs,
        roundRobinIndex: this.roundRobinIndex,
        lastBookingNumber: this.lastBookingNumber,
        lastPersistedAt: new Date().toISOString(),
      };

      fs.writeFileSync(this.dbPath, JSON.stringify(snapshot, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save CRM snapshot to persistent database:", err);
    }
  }

  // ----------------------------------------------------
  // Users & RBAC Hierarchy Management
  // ----------------------------------------------------
  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getSalesAgents(): User[] {
    return this.users.filter((u) => u.role === "SALES_AGENT" && u.isActive);
  }

  getCsAgents(): User[] {
    return this.users.filter((u) => u.role === "CS_AGENT" && u.isActive);
  }

  createUser(
    actor: User,
    payload: {
      name: string;
      username?: string;
      email?: string;
      role: Role;
      departmentId?: string;
      avatarUrl?: string;
    }
  ): { success: boolean; user?: User; error?: string } {
    // 1. Strict Hierarchy Validation
    const check = canCreateUserRole(actor.role, payload.role);
    if (!check.allowed) {
      this.logAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        action: "USER_CREATION_DENIED",
        resource: `Role:${payload.role}`,
        ipAddress: "127.0.0.1",
        status: "DENIED",
        payload: { actorRole: actor.role, targetRole: payload.role, reason: check.reason },
      });
      return { success: false, error: check.reason || "Unauthorized to create this role" };
    }

    const isAgent =
      payload.role === "SALES_AGENT" ||
      payload.role === "CHARGING_OPERATOR" ||
      payload.role === "CS_AGENT";

    // 2. Validate Username and Email according to role requirements:
    // Agents: Created primarily with username. Email can default to username@travelocase.com if not provided.
    // Admins and Managers: Both username AND email are strictly required.
    const rawUsername = (payload.username || "").trim();
    const cleanUsername = rawUsername
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/[^a-z0-9._-]/g, "");

    if (!cleanUsername) {
      return {
        success: false,
        error: isAgent
          ? "Username is required to create an agent."
          : "Username is required for Admin and Manager accounts.",
      };
    }

    let cleanEmail = (payload.email || "").trim().toLowerCase();
    if (!cleanEmail) {
      if (isAgent) {
        cleanEmail = `${cleanUsername}@travelocase.com`;
      } else {
        return {
          success: false,
          error: "Enterprise corporate email is required for Admin and Manager accounts.",
        };
      }
    }

    // 3. Validate uniqueness for username and email
    if (
      this.users.some(
        (u) =>
          u.username &&
          u.username.toLowerCase().replace(/^@/, "") === cleanUsername
      )
    ) {
      return {
        success: false,
        error: `Username '@${cleanUsername}' is already in use. Please choose another username.`,
      };
    }

    if (this.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: `A user with email '${cleanEmail}' already exists.`,
      };
    }

    // 4. Resolve department scope
    const deptType = ROLE_DEPARTMENT_MAP[payload.role] || "ADMIN";
    const defaultDeptId =
      payload.departmentId ||
      (deptType === "SALES"
        ? "dept_sales"
        : deptType === "CHARGING"
        ? "dept_charging"
        : deptType === "CUSTOMER_SERVICE"
        ? "dept_cs"
        : "dept_admin");

    // Realistic avatars by gender / role style
    const defaultAvatars = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    ];
    const chosenAvatar = payload.avatarUrl || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const userId = `usr_${payload.role.toLowerCase()}_` + Math.random().toString(36).substring(2, 7);
    const newUser: User = {
      id: userId,
      tenantId: actor.tenantId || "tenant_travelocase",
      departmentId: defaultDeptId,
      username: cleanUsername,
      email: cleanEmail,
      name: payload.name.trim(),
      role: payload.role,
      avatarUrl: chosenAvatar,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);

    // 5. Log Activity
    this.logActivity({
      entityType: "USER",
      entityId: newUser.id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "USER_CREATED",
      toState: "ACTIVE",
      metadata: {
        newUserName: newUser.name,
        newUserUsername: newUser.username,
        newUserEmail: newUser.email,
        newUserRole: newUser.role,
        departmentId: newUser.departmentId,
        createdByName: actor.name,
        createdByRole: actor.role,
      },
    });

    // 6. System Audit Trail
    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "USER_CREATED",
      resource: `User:${newUser.id}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: {
        userId: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        departmentId: newUser.departmentId,
        creatorName: actor.name,
        creatorRole: actor.role,
      },
    });

    broadcastEvent({
      type: "USER_CREATED" as any,
      tenantId: newUser.tenantId,
      actor: { id: actor.id, name: actor.name, role: actor.role },
      payload: { user: newUser },
    });

    this.saveToDatabase();
    return { success: true, user: newUser };
  }

  deleteUser(
    actor: User,
    userId: string
  ): { success: boolean; error?: string } {
    const targetUser = this.users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: "User not found" };

    if (targetUser.id === actor.id) {
      return { success: false, error: "Cannot delete your own active session account." };
    }

    const check = canCreateUserRole(actor.role, targetUser.role);
    if (!check.allowed && actor.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: `Unauthorized: You do not have permission to delete a user with role '${targetUser.role}'.`,
      };
    }

    this.users = this.users.filter((u) => u.id !== userId);

    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "USER_DELETED",
      resource: `User:${userId}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: {
        deletedUserId: targetUser.id,
        deletedUserEmail: targetUser.email,
        deletedUserRole: targetUser.role,
        actor: actor.email,
      },
    });

    this.saveToDatabase();
    return { success: true };
  }

  toggleUserStatus(
    actor: User,
    userId: string
  ): { success: boolean; user?: User; error?: string } {
    const targetUser = this.users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: "User not found" };

    if (targetUser.id === actor.id) {
      return { success: false, error: "Cannot deactivate your own active session account." };
    }

    const check = canCreateUserRole(actor.role, targetUser.role);
    if (!check.allowed && actor.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: `Unauthorized: You do not have permission to modify status for role '${targetUser.role}'.`,
      };
    }

    targetUser.isActive = !targetUser.isActive;

    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: targetUser.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      resource: `User:${userId}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: {
        userId: targetUser.id,
        email: targetUser.email,
        newStatus: targetUser.isActive ? "ACTIVE" : "INACTIVE",
        actor: actor.email,
      },
    });

    this.saveToDatabase();
    return { success: true, user: targetUser };
  }

  // ----------------------------------------------------
  // Leads & Pipeline with Strict Department & Agent Isolation
  // ----------------------------------------------------
  getLeads(
    role?: Role,
    userId?: string,
    options?: { bookingId?: string; search?: string }
  ): Lead[] {
    let result = this.leads;

    // 1. Strict Role-Based Access Isolation
    if (role === "SALES_AGENT" && userId) {
      // SALES AGENT CAN ONLY EVER SEE LEADS EXPLICITLY ASSIGNED TO THEM
      result = result.filter((l) => l.assignedToId === userId);
    } else if (role === "CHARGING_MANAGER" || role === "CHARGING_OPERATOR") {
      result = result.filter((l) =>
        ["FINAL", "SALE", "CHARGING", "SUCCESS", "FAILED"].includes(l.status)
      );
    } else if (role === "CS_MANAGER" || role === "CS_AGENT") {
      result = result.filter((l) => l.status === "SUCCESS");
    }
    // SUPER_ADMIN, ADMIN, SALES_MANAGER see all leads across their department / tenant

    // 2. Booking ID Search / Filter
    if (options?.bookingId) {
      const rawBId = options.bookingId.trim();
      const bId = rawBId.toLowerCase();
      const cleanNumeric = rawBId.replace(/^#/, "").trim();
      result = result.filter(
        (l) =>
          l.id.toLowerCase() === bId ||
          (l.bookingNumber && l.bookingNumber.toString() === cleanNumeric) ||
          (l.bookingId && l.bookingId.toLowerCase() === bId) ||
          (l.bookingDetails?.pnrCode &&
            l.bookingDetails.pnrCode.toLowerCase().includes(bId))
      );
    }

    // 3. Text Search Query
    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, "").trim();
      result = result.filter(
        (l) =>
          (l.bookingNumber && l.bookingNumber.toString().includes(cleanQ)) ||
          (l.bookingId && l.bookingId.toLowerCase().includes(q)) ||
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.company && l.company.toLowerCase().includes(q)) ||
          (l.bookingDetails?.pnrCode &&
            l.bookingDetails.pnrCode.toLowerCase().includes(q)) ||
          (l.bookingDetails?.airline &&
            l.bookingDetails.airline.toLowerCase().includes(q))
      );
    }

    return result;
  }

  getLeadById(
    id: string,
    role?: Role,
    userId?: string
  ): { lead?: Lead; forbidden?: boolean } {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return {};

    // Enforce row-level security for Sales Agent
    if (role === "SALES_AGENT" && userId && lead.assignedToId !== userId) {
      return { forbidden: true };
    }

    return { lead };
  }

  findLeadByBookingId(
    bookingId: string,
    role?: Role,
    userId?: string
  ): { success: boolean; lead?: Lead; error?: string } {
    const rawQuery = bookingId.trim();
    const query = rawQuery.toLowerCase();
    const cleanNumeric = rawQuery.replace(/^#/, "").trim();

    const lead = this.leads.find(
      (l) =>
        (l.bookingNumber && l.bookingNumber.toString() === cleanNumeric) ||
        (l.bookingId && l.bookingId.toLowerCase() === query) ||
        l.id.toLowerCase() === query ||
        (l.bookingDetails?.pnrCode &&
          l.bookingDetails.pnrCode.toLowerCase() === query)
    );

    if (!lead) {
      return { success: false, error: "Booking ID not found in database." };
    }

    // Agent row-level security check
    if (role === "SALES_AGENT" && userId && lead.assignedToId !== userId) {
      return {
        success: false,
        error: "Access Denied: This booking is assigned to another agent.",
      };
    }

    return { success: true, lead };
  }

  // Card View Audit Tracking (Logged directly into Digital Footprint)
  logCardView(
    leadId: string,
    actor: User,
    ipAddress?: string
  ): { success: boolean; error?: string } {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return { success: false, error: "Lead not found" };

    const timestamp = new Date().toISOString();
    const last4 = lead.cardDetails?.cardNumber?.slice(-4) || "4242";

    // 1. Append directly to Digital Footprint Clickstream
    if (lead.footprint) {
      lead.footprint.clickstream.push({
        timestamp,
        event: "CARD_DETAILS_VIEWED",
        url: `/leads/${lead.id}/pci-vault`,
        metadata: {
          viewerName: actor.name,
          viewerRole: actor.role,
          viewerEmail: actor.email,
          ipAddress: ipAddress || "127.0.0.1",
          cardLast4: last4,
        },
      });
    }

    // 2. Append to Lead Activity Log
    this.logActivity({
      entityType: "LEAD",
      entityId: lead.id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CARD_DETAILS_VIEWED",
      metadata: {
        viewerRole: actor.role,
        cardLast4: last4,
        ipAddress: ipAddress || "127.0.0.1",
      },
    });

    // 3. Append to System Immutable Audit Log
    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "CARD_DETAILS_VIEWED",
      resource: `Lead:${lead.id}:CardVault`,
      ipAddress: ipAddress || "127.0.0.1",
      status: "SUCCESS",
      payload: {
        actorName: actor.name,
        actorRole: actor.role,
        leadId: lead.id,
        cardLast4: last4,
        timestamp,
      },
    });

    this.saveToDatabase();
    return { success: true };
  }

  // ----------------------------------------------------
  // Lead Assignment & Bulk Reassignment (Admins & Managers)
  // ----------------------------------------------------
  assignLead(
    actor: User,
    leadId: string,
    targetAgentId: string
  ): { success: boolean; lead?: Lead; error?: string } {
    // 1. Permission check: Only Super Admin, Admin, and Managers can assign leads
    if (
      actor.role !== "SUPER_ADMIN" &&
      actor.role !== "ADMIN" &&
      !actor.role.endsWith("_MANAGER")
    ) {
      return {
        success: false,
        error: "Unauthorized: Only Admins and Department Managers can assign or reassign leads to agents.",
      };
    }

    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return { success: false, error: "Lead booking not found." };

    const targetAgent = this.users.find((u) => u.id === targetAgentId);
    if (!targetAgent) return { success: false, error: "Target agent not found." };

    const prevAgentName = lead.assignedToName || "Unassigned";
    lead.assignedToId = targetAgent.id;
    lead.assignedToName = targetAgent.name;
    lead.updatedAt = new Date().toISOString();

    this.logActivity({
      entityType: "LEAD",
      entityId: lead.id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "LEAD_ASSIGNED",
      fromState: prevAgentName,
      toState: targetAgent.name,
      metadata: {
        assignedToId: targetAgent.id,
        assignedToName: targetAgent.name,
        assignedToUsername: targetAgent.username,
        assignedById: actor.id,
        assignedByName: actor.name,
        assignedByRole: actor.role,
      },
    });

    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "LEAD_ASSIGNED",
      resource: `Lead:${lead.id}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: {
        leadId: lead.id,
        bookingNumber: lead.bookingNumber,
        assignedToId: targetAgent.id,
        assignedToName: targetAgent.name,
        previousAgent: prevAgentName,
        assignedBy: actor.name,
      },
    });

    broadcastEvent({
      type: "LEAD_TRANSITION",
      tenantId: lead.tenantId,
      actor: { id: actor.id, name: actor.name, role: actor.role },
      payload: {
        leadId: lead.id,
        action: "LEAD_ASSIGNED",
        assignedToId: targetAgent.id,
        assignedToName: targetAgent.name,
      },
    });

    this.saveToDatabase();
    return { success: true, lead };
  }

  bulkAssignLeads(
    actor: User,
    leadIds: string[],
    targetAgentId: string
  ): { success: boolean; count?: number; leads?: Lead[]; error?: string } {
    if (
      actor.role !== "SUPER_ADMIN" &&
      actor.role !== "ADMIN" &&
      !actor.role.endsWith("_MANAGER")
    ) {
      return {
        success: false,
        error: "Unauthorized: Only Admins and Department Managers can assign or reassign leads to agents.",
      };
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return { success: false, error: "No leads selected for assignment." };
    }

    const targetAgent = this.users.find((u) => u.id === targetAgentId);
    if (!targetAgent) return { success: false, error: "Target agent not found." };

    const updatedLeads: Lead[] = [];
    const timestamp = new Date().toISOString();

    for (const id of leadIds) {
      const lead = this.leads.find((l) => l.id === id);
      if (lead) {
        const prevAgentName = lead.assignedToName || "Unassigned";
        lead.assignedToId = targetAgent.id;
        lead.assignedToName = targetAgent.name;
        lead.updatedAt = timestamp;
        updatedLeads.push(lead);

        this.logActivity({
          entityType: "LEAD",
          entityId: lead.id,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          action: "LEAD_BULK_ASSIGNED",
          fromState: prevAgentName,
          toState: targetAgent.name,
          metadata: {
            assignedToId: targetAgent.id,
            assignedToName: targetAgent.name,
            assignedToUsername: targetAgent.username,
            batchCount: leadIds.length,
          },
        });
      }
    }

    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "LEADS_BULK_ASSIGNED",
      resource: `Batch:${updatedLeads.length}_Leads`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: {
        assignedCount: updatedLeads.length,
        targetAgentId: targetAgent.id,
        targetAgentName: targetAgent.name,
        targetAgentUsername: targetAgent.username,
        leadIds: updatedLeads.map((l) => l.id),
        bookingNumbers: updatedLeads.map((l) => l.bookingNumber),
      },
    });

    broadcastEvent({
      type: "LEAD_TRANSITION",
      tenantId: actor.tenantId || "tenant_travelocase",
      actor: { id: actor.id, name: actor.name, role: actor.role },
      payload: {
        action: "LEADS_BULK_ASSIGNED",
        count: updatedLeads.length,
        assignedToId: targetAgent.id,
        assignedToName: targetAgent.name,
        leadIds: updatedLeads.map((l) => l.id),
      },
    });

    this.saveToDatabase();
    return { success: true, count: updatedLeads.length, leads: updatedLeads };
  }

  // Manager Grant Protocol for Card View
  grantCardAccess(
    leadId: string,
    manager: User
  ): { success: boolean; lead?: Lead; error?: string } {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return { success: false, error: "Lead not found" };

    if (
      manager.role !== "SALES_MANAGER" &&
      manager.role !== "ADMIN" &&
      manager.role !== "SUPER_ADMIN"
    ) {
      return {
        success: false,
        error: "Only Managers or Admins can grant card clearance.",
      };
    }

    if (!lead.cardDetails) {
      return { success: false, error: "No card details attached to this booking." };
    }

    lead.cardDetails.isAccessGrantedToAgent = true;
    lead.cardDetails.grantedByManagerId = manager.id;
    lead.cardDetails.grantedByManagerName = manager.name;
    lead.cardDetails.grantedAt = new Date().toISOString();
    lead.updatedAt = new Date().toISOString();

    this.logActivity({
      entityType: "LEAD",
      entityId: lead.id,
      actorId: manager.id,
      actorName: manager.name,
      actorRole: manager.role,
      action: "CARD_ACCESS_GRANTED_BY_MANAGER",
      metadata: {
        grantedBy: manager.name,
        assignedAgent: lead.assignedToName,
      },
    });

    this.logAudit({
      actorId: manager.id,
      actorEmail: manager.email,
      action: "MANAGER_CARD_CLEARANCE_GRANTED",
      resource: `Lead:${lead.id}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: { manager: manager.name, agent: lead.assignedToName },
    });

    broadcastEvent({
      type: "LEAD_TRANSITION",
      tenantId: lead.tenantId,
      actor: { id: manager.id, name: manager.name, role: manager.role },
      payload: { leadId: lead.id, action: "CARD_CLEARANCE_GRANTED" },
    });

    this.saveToDatabase();
    return { success: true, lead };
  }

  // Send Predefined / Custom Travel Email
  sendPredefinedEmail(
    leadId: string,
    templateId: string,
    actor: User,
    customData?: {
      recipientEmail?: string;
      subject?: string;
      body?: string;
      senderEmail?: string;
    }
  ): {
    success: boolean;
    email?: { from: string; subject: string; body: string; recipientEmail: string };
    lead?: Lead;
    error?: string;
  } {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return { success: false, error: "Lead not found" };

    const bookingRef = lead.bookingNumber
      ? `#${lead.bookingNumber}`
      : lead.bookingDetails?.pnrCode || "TC-" + lead.id.substring(lead.id.length - 6).toUpperCase();

    const template =
      PREDEFINED_EMAIL_TEMPLATES.find((t) => t.id === templateId) ||
      PREDEFINED_EMAIL_TEMPLATES[0];
    const rendered = renderEmailTemplate(template, lead, actor.name);

    let finalSubject = (customData?.subject || rendered.subject).trim();
    const prefix = `[Booking ID: ${bookingRef}]`;
    if (!finalSubject.includes(prefix)) {
      finalSubject = `${prefix} ${finalSubject}`;
    }

    const finalBody = customData?.body || rendered.body;
    const finalRecipient = customData?.recipientEmail || lead.email;
    const fromEmail = OFFICIAL_SENDER_EMAIL; // Single official sender address ticketing@travelocase.com

    lead.authEmailSent = true;
    if (lead.status === "NEW" || lead.status === "FOLLOW_UP") {
      lead.status = "AUTHENTICATION_SENT";
    }
    lead.updatedAt = new Date().toISOString();

    this.logActivity({
      entityType: "LEAD",
      entityId: lead.id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "TRAVEL_EMAIL_DISPATCHED",
      metadata: {
        from: fromEmail,
        templateTitle: template.title,
        recipient: finalRecipient,
        subject: finalSubject,
        isCustomized: Boolean(
          customData?.body || customData?.subject || customData?.recipientEmail
        ),
      },
    });

    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "TRAVEL_CONFIRMATION_EMAIL_DISPATCHED",
      resource: `Lead:${lead.id}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: {
        from: fromEmail,
        templateId,
        recipient: finalRecipient,
        subject: finalSubject,
      },
    });

    broadcastEvent({
      type: "LEAD_TRANSITION",
      tenantId: lead.tenantId,
      actor: { id: actor.id, name: actor.name, role: actor.role },
      payload: {
        leadId: lead.id,
        action: "EMAIL_SENT",
        status: lead.status,
        from: fromEmail,
        recipient: finalRecipient,
        subject: finalSubject,
      },
    });

    this.saveToDatabase();
    return {
      success: true,
      email: {
        from: fromEmail,
        subject: finalSubject,
        body: finalBody,
        recipientEmail: finalRecipient,
      },
      lead,
    };
  }

  // State Machine Transition Handler
  transitionLead(
    leadId: string,
    targetStatus: LeadStatus,
    actor: User,
    metadata?: Record<string, unknown>
  ): { success: boolean; lead?: Lead; error?: string } {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    // Role check for transition
    const check = canTransitionLead(actor.role, lead.status, targetStatus);
    if (!check.allowed) {
      this.logAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        action: "LEAD_STAGE_TRANSITION_DENIED",
        resource: `Lead:${leadId}`,
        ipAddress: "127.0.0.1",
        status: "DENIED",
        payload: { from: lead.status, target: targetStatus, reason: check.reason },
      });
      return { success: false, error: check.reason || "Unauthorized transition" };
    }

    const previousStatus = lead.status;
    lead.status = targetStatus;
    lead.updatedAt = new Date().toISOString();

    // Log Activity
    this.logActivity({
      entityType: "LEAD",
      entityId: lead.id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: `TRANSITION_TO_${targetStatus}`,
      fromState: previousStatus,
      toState: targetStatus,
      metadata,
    });

    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "LEAD_STAGE_TRANSITION",
      resource: `Lead:${leadId}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: { from: previousStatus, to: targetStatus, ...metadata },
    });

    broadcastEvent({
      type: "LEAD_TRANSITION",
      tenantId: lead.tenantId,
      actor: { id: actor.id, name: actor.name, role: actor.role },
      payload: {
        leadId: lead.id,
        leadName: lead.name,
        from: previousStatus,
        to: targetStatus,
      },
    });

    // ========================================================
    // STAGE 3 AUTOMATED HANDOFF: FINAL or SALE -> CHARGING QUEUE
    // ========================================================
    if (targetStatus === "FINAL" || targetStatus === "SALE") {
      lead.status = "CHARGING";
      const newTxn: Transaction = {
        id: "txn_" + Math.random().toString(36).substring(2, 8),
        tenantId: lead.tenantId,
        leadId: lead.id,
        leadName: `${lead.name} (${
          lead.bookingDetails?.origin || "Origin"
        } -> ${lead.bookingDetails?.destination || "Dest"})`,
        amount: lead.dealValue,
        currency: lead.currency || "USD",
        status: "PENDING",
        paymentMethod: lead.cardDetails
          ? `${lead.cardDetails.cardType}_CREDIT_CARD`
          : "CORPORATE_COMMERCIAL",
        verificationChecklist: {
          identityVerified: true,
          fundsAvailable: false,
          fraudRiskScore: Math.floor(Math.random() * 10) + 2,
          avsMatch: true,
          cvvMatch: true,
          complianceCleared: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.transactions.unshift(newTxn);

      this.logActivity({
        entityType: "TRANSACTION",
        entityId: newTxn.id,
        actorName: "Workflow State Engine",
        actorRole: "SYSTEM",
        action: "CHARGING_ENQUEUED",
        fromState: targetStatus,
        toState: "CHARGING",
        metadata: { amount: newTxn.amount, leadId: lead.id },
      });

      broadcastEvent({
        type: "CHARGING_ENQUEUED",
        tenantId: lead.tenantId,
        actor: { name: "Workflow State Engine", role: "SYSTEM" },
        payload: {
          transactionId: newTxn.id,
          leadId: lead.id,
          amount: newTxn.amount,
        },
      });
    }

    this.saveToDatabase();
    return { success: true, lead };
  }

  // Ingestion with Digital Footprint, Flight Booking, and Card Details
  ingestLead(payload: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    dealValue?: number;
    currency?: string;
    notes?: string;
    assignedToId?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    clickstream?: {
      timestamp: string;
      event: string;
      url: string;
      dwellTimeSeconds?: number;
    }[];
    bookingDetails?: FlightBooking;
    cardDetails?: CardDetails;
  }): Lead {
    const leadId = "lead_" + Math.random().toString(36).substring(2, 9);
    const authResult = evaluateSenderAuthenticity(
      payload.email,
      payload.ipAddress
    );

    // Auto-assign to Sales Agent via Round Robin or explicit agent assignment
    const salesAgents = this.getSalesAgents();
    let assignedAgent: User | undefined = undefined;
    if (payload.assignedToId) {
      assignedAgent = this.users.find((u) => u.id === payload.assignedToId);
    } else if (salesAgents.length > 0) {
      assignedAgent = salesAgents[this.roundRobinIndex % salesAgents.length];
      this.roundRobinIndex++;
    }

    // Auto-increment simple number based booking ID
    this.lastBookingNumber = Math.max(this.lastBookingNumber || 1000, 1000) + 1;
    const nextBookingNumber = this.lastBookingNumber;
    const defaultPnr = "TC-" + nextBookingNumber;

    const defaultBooking: FlightBooking = payload.bookingDetails || {
      origin: "JFK (New York)",
      destination: "LHR (London Heathrow)",
      tripType: "ROUND_TRIP",
      departureDate: "2026-10-20",
      returnDate: "2026-10-30",
      airline: "British Airways",
      flightNumber: "BA-178",
      cabinClass: "BUSINESS",
      pnrCode: defaultPnr,
      passengers: [
        {
          id: "pax_" + Math.random().toString(36).substring(2, 6),
          fullName: payload.name,
          passportNumber:
            "US" + Math.floor(10000000 + Math.random() * 90000000),
          passportExpiry: "2031-10-15",
          nationality: "United States (USA)",
          dob: "1985-06-15",
          type: "ADULT",
          seatPreference: "2A",
          mealPreference: "Standard Gourmet",
          specialAssistance: "None",
          eTicketNumber:
            "ETKT-125-" + Math.floor(1000000000 + Math.random() * 9000000000),
        },
      ],
    };

    if (!defaultBooking.pnrCode) {
      defaultBooking.pnrCode = defaultPnr;
    }

    const defaultCard: CardDetails = payload.cardDetails || {
      cardholderName: payload.name.toUpperCase(),
      cardNumber:
        "4532" + Math.floor(100000000000 + Math.random() * 900000000000),
      expiryMonth: "10",
      expiryYear: "2028",
      cvv: "892",
      cardType: "VISA",
      isAccessGrantedToAgent: false,
    };

    const newLead: Lead = {
      id: leadId,
      bookingNumber: nextBookingNumber,
      bookingId: `#${nextBookingNumber}`,
      tenantId: "tenant_travelocase",
      assignedToId: assignedAgent?.id,
      assignedToName: assignedAgent?.name,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || "+1 (555) 019-3344",
      company: payload.company || "Corporate Client",
      status: "NEW",
      dealValue: payload.dealValue || 12500,
      currency: payload.currency || "USD",
      notes:
        payload.notes ||
        `Flight inquiry booking #${nextBookingNumber} ingested with passenger roster and card vault record.`,
      bookingDetails: defaultBooking,
      cardDetails: defaultCard,
      authEmailSent: false,
      authCallConfirmed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      footprint: {
        id: "fp_" + leadId,
        leadId,
        ipAddress:
          payload.ipAddress ||
          "198.51.100." + Math.floor(Math.random() * 200),
        userAgent:
          payload.userAgent ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        referrer: payload.referrer || "https://google.com",
        country: "United States",
        city: "New York, NY",
        utmSource: payload.utmSource || "flight_portal",
        utmMedium: payload.utmMedium || "cpc",
        utmCampaign: payload.utmCampaign || "luxury_business_routes",
        utmTerm: payload.utmTerm,
        utmContent: payload.utmContent,
        clickstream:
          payload.clickstream && payload.clickstream.length > 0
            ? payload.clickstream
            : [
                {
                  timestamp: new Date(Date.now() - 300000).toISOString(),
                  event: "ROUTE_SEARCH",
                  url: `/flights/${defaultBooking.origin}-${defaultBooking.destination}`,
                  dwellTimeSeconds: 45,
                },
                {
                  timestamp: new Date(Date.now() - 120000).toISOString(),
                  event: "PASSENGER_DETAILS_FILLED",
                  url: "/checkout/passengers",
                  dwellTimeSeconds: 120,
                },
                {
                  timestamp: new Date().toISOString(),
                  event: "CARD_DETAILS_SUBMITTED",
                  url: "/checkout/payment",
                },
              ],
        createdAt: new Date().toISOString(),
      },
      emailVerification: {
        id: "ev_" + leadId,
        leadId,
        email: payload.email,
        spfResult: authResult.spfResult,
        dkimResult: authResult.dkimResult,
        dmarcResult: authResult.dmarcResult,
        mxRecordExists: authResult.mxRecordExists,
        smtpCheckValid: authResult.smtpCheckValid,
        score: authResult.score,
        rawDetails: authResult.details,
        verifiedAt: new Date().toISOString(),
      },
    };

    this.leads.unshift(newLead);

    this.logActivity({
      entityType: "LEAD",
      entityId: newLead.id,
      actorName: "Flight Ingestion Engine",
      actorRole: "SYSTEM",
      action: "LEAD_INGESTED",
      toState: "NEW",
      metadata: {
        route: `${defaultBooking.origin} -> ${defaultBooking.destination}`,
        airline: defaultBooking.airline,
        authenticityScore: authResult.score,
        assignedTo: assignedAgent?.name,
      },
    });

    this.logAudit({
      actorEmail: "ingress.travel@travelocase.com",
      action: "FLIGHT_BOOKING_INGESTED",
      resource: `Lead:${newLead.id}`,
      ipAddress: payload.ipAddress || "127.0.0.1",
      status: "SUCCESS",
      payload: {
        email: newLead.email,
        route: `${defaultBooking.origin} -> ${defaultBooking.destination}`,
      },
    });

    broadcastEvent({
      type: "LEAD_INGESTED",
      tenantId: newLead.tenantId,
      actor: { name: "Flight Ingestion Engine", role: "SYSTEM" },
      payload: { lead: newLead },
    });

    this.saveToDatabase();
    return newLead;
  }

  // ----------------------------------------------------
  // Charging & Financial Queues
  // ----------------------------------------------------
  getTransactions(): Transaction[] {
    return this.transactions;
  }

  processTransaction(
    txnId: string,
    action: "CAPTURE" | "DECLINE" | "REFUND",
    actor: User,
    options?: { failureReason?: string; paymentMethod?: string }
  ): { success: boolean; transaction?: Transaction; error?: string } {
    const txn = this.transactions.find((t) => t.id === txnId);
    if (!txn) return { success: false, error: "Transaction not found" };

    const lead = this.leads.find((l) => l.id === txn.leadId);

    if (action === "CAPTURE") {
      txn.status = "SUCCESS";
      txn.processedById = actor.id;
      txn.processedByName = actor.name;
      txn.gatewayTxnId =
        "GW_AIRLINE_SETTLED_" +
        Math.random().toString(36).substring(2, 8).toUpperCase();
      txn.updatedAt = new Date().toISOString();

      if (lead) {
        lead.status = "SUCCESS";
        lead.updatedAt = new Date().toISOString();
      }

      // Stage 4 Service Handoff: Customer Profile & CS Concierge Ticket
      let customer = this.customers.find(
        (c) => c.leadId === (lead ? lead.id : "")
      );
      if (!customer && lead) {
        customer = {
          id: "cust_" + Math.random().toString(36).substring(2, 8),
          tenantId: lead.tenantId,
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company || "Enterprise Travel Client",
          tier:
            txn.amount >= 20000
              ? "VIP_FIRST_CLASS_GLOBAL"
              : "BUSINESS_EXECUTIVE",
          healthScore: 100,
          onboardingStatus: "IN_PROGRESS",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.customers.unshift(customer);
        txn.customerId = customer.id;
      }

      const csAgents = this.getCsAgents();
      const assignedCs = csAgents.length > 0 ? csAgents[0] : undefined;

      const newTicket: Ticket = {
        id: "tkt_onb_" + Math.random().toString(36).substring(2, 7),
        tenantId: txn.tenantId,
        customerId: customer?.id,
        customerName: customer
          ? `${customer.company} (${customer.name})`
          : lead?.name || "VIP Passenger",
        leadId: lead?.id,
        assignedToId: assignedCs?.id,
        assignedToName: assignedCs?.name,
        title: `VIP Flight Concierge & E-Ticket Issuance - ${lead?.name} (${
          lead?.bookingDetails?.origin || "Origin"
        } -> ${lead?.bookingDetails?.destination || "Dest"})`,
        description: `Automated onboarding ticket dispatched upon successful payment capture of ${
          txn.amount
        } ${txn.currency}. Coordinate airline PNR ${
          lead?.bookingDetails?.pnrCode || "N/A"
        }, seat assignments, and private lounge access.`,
        priority: "HIGH",
        status: "OPEN",
        type: "ONBOARDING",
        slaDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        isSlaBreached: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.tickets.unshift(newTicket);

      this.logActivity({
        entityType: "TRANSACTION",
        entityId: txn.id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: "PAYMENT_CAPTURED_SUCCESS",
        fromState: "PROCESSING",
        toState: "SUCCESS",
        metadata: {
          amount: txn.amount,
          customerId: customer?.id,
          ticketId: newTicket.id,
        },
      });

      this.logActivity({
        entityType: "TICKET",
        entityId: newTicket.id,
        actorName: "Workflow State Engine",
        actorRole: "SYSTEM",
        action: "ONBOARDING_TICKET_AUTO_DISPATCHED",
        toState: "OPEN",
        metadata: { slaHours: 4, customerId: customer?.id },
      });

      this.logAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        action: "TRANSACTION_SETTLED_AND_SERVICE_HANDOFF",
        resource: `Transaction:${txn.id}`,
        ipAddress: "127.0.0.1",
        status: "SUCCESS",
        payload: {
          amount: txn.amount,
          customerId: customer?.id,
          ticketId: newTicket.id,
        },
      });

      broadcastEvent({
        type: "TRANSACTION_PROCESSED",
        tenantId: txn.tenantId,
        actor: { id: actor.id, name: actor.name, role: actor.role },
        payload: {
          transactionId: txn.id,
          status: "SUCCESS",
          amount: txn.amount,
        },
      });

      broadcastEvent({
        type: "TICKET_CREATED",
        tenantId: txn.tenantId,
        actor: { name: "Workflow State Engine", role: "SYSTEM" },
        payload: { ticket: newTicket },
      });
    } else if (action === "DECLINE") {
      txn.status = "FAILED";
      txn.failureReason =
        options?.failureReason ||
        "Declined by airline payment gateway: Card authorization failure";
      txn.updatedAt = new Date().toISOString();
      if (lead) {
        lead.status = "FAILED";
        lead.updatedAt = new Date().toISOString();
      }

      this.logActivity({
        entityType: "TRANSACTION",
        entityId: txn.id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: "PAYMENT_DECLINED",
        toState: "FAILED",
        metadata: { reason: txn.failureReason },
      });

      this.logAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        action: "TRANSACTION_DECLINED",
        resource: `Transaction:${txn.id}`,
        ipAddress: "127.0.0.1",
        status: "SUCCESS",
        payload: { reason: txn.failureReason },
      });

      broadcastEvent({
        type: "TRANSACTION_PROCESSED",
        tenantId: txn.tenantId,
        actor: { id: actor.id, name: actor.name, role: actor.role },
        payload: {
          transactionId: txn.id,
          status: "FAILED",
          reason: txn.failureReason,
        },
      });
    }

    this.saveToDatabase();
    return { success: true, transaction: txn };
  }

  // ----------------------------------------------------
  // Customer Service & SLA Desk
  // ----------------------------------------------------
  getCustomers(): Customer[] {
    return this.customers;
  }

  getTickets(role?: Role, userId?: string): Ticket[] {
    if (role === "CS_AGENT" && userId) {
      return this.tickets.filter((t) => t.assignedToId === userId);
    }
    return this.tickets;
  }

  updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    actor: User
  ): { success: boolean; ticket?: Ticket; error?: string } {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { success: false, error: "Ticket not found" };

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();

    this.logActivity({
      entityType: "TICKET",
      entityId: ticket.id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: `TICKET_${status}`,
      fromState: oldStatus,
      toState: status,
    });

    this.logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "TICKET_STATUS_UPDATE",
      resource: `Ticket:${ticket.id}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      payload: { from: oldStatus, to: status },
    });

    broadcastEvent({
      type: "TICKET_UPDATED",
      tenantId: ticket.tenantId,
      actor: { id: actor.id, name: actor.name, role: actor.role },
      payload: { ticketId: ticket.id, status },
    });

    this.saveToDatabase();
    return { success: true, ticket };
  }

  // ----------------------------------------------------
  // Activity & Audit Logs
  // ----------------------------------------------------
  getActivityLogs(entityId?: string): ActivityLog[] {
    if (entityId) {
      return this.activityLogs.filter((l) => l.entityId === entityId);
    }
    return this.activityLogs;
  }

  getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  logActivity(
    data: Omit<ActivityLog, "id" | "tenantId" | "createdAt">
  ): ActivityLog {
    const newLog: ActivityLog = {
      ...data,
      id: "act_" + Math.random().toString(36).substring(2, 9),
      tenantId: "tenant_travelocase",
      createdAt: new Date().toISOString(),
    };
    this.activityLogs.unshift(newLog);
    return newLog;
  }

  logAudit(data: Omit<AuditLog, "id" | "tenantId" | "timestamp">): AuditLog {
    const newAudit: AuditLog = {
      ...data,
      id: "aud_" + Math.random().toString(36).substring(2, 9),
      tenantId: "tenant_travelocase",
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(newAudit);
    return newAudit;
  }

  getAnalytics() {
    const totalLeads = this.leads.length;
    const finalLeads = this.leads.filter((l) =>
      ["FINAL", "SALE", "CHARGING", "SUCCESS"].includes(l.status)
    ).length;
    const wonLeads = this.leads.filter((l) => l.status === "SUCCESS").length;
    const pipelineValue = this.leads.reduce((acc, l) => acc + l.dealValue, 0);
    const collectedRevenue = this.transactions
      .filter((t) => t.status === "SUCCESS")
      .reduce((acc, t) => acc + t.amount, 0);
    const pendingChargingValue = this.transactions
      .filter((t) => t.status === "PENDING" || t.status === "PROCESSING")
      .reduce((acc, t) => acc + t.amount, 0);
    const openTickets = this.tickets.filter(
      (t) => t.status !== "RESOLVED" && t.status !== "CLOSED"
    ).length;
    const breachedTickets = this.tickets.filter((t) => t.isSlaBreached).length;

    return {
      totalLeads,
      finalLeads,
      wonLeads,
      conversionRate:
        totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0",
      pipelineValue,
      collectedRevenue,
      pendingChargingValue,
      openTickets,
      breachedTickets,
      chargingQueueCount: this.transactions.filter(
        (t) => t.status === "PENDING" || t.status === "PROCESSING"
      ).length,
    };
  }
}

// Global Singleton attached to globalThis for Next.js hot-reload persistence
const globalForCrmStore = globalThis as unknown as {
  crmStore: EnterpriseCRMStore;
};
export const crmStore =
  globalForCrmStore.crmStore || new EnterpriseCRMStore();
if (process.env.NODE_ENV !== "production") {
  globalForCrmStore.crmStore = crmStore;
}
