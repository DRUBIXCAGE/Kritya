import { Role, DepartmentType, LeadStatus } from "@/types";

export interface PermissionCheck {
  canViewAllTenants?: boolean;
  canManageUsers?: boolean;
  canConfigureDepartments?: boolean;
  canViewAuditLogs?: boolean;
  canAssignLeads?: boolean;
  canQualifyLeads?: boolean;
  canTransitionToFinal?: boolean;
  canProcessCharging?: boolean;
  canValidateTransactions?: boolean;
  canManageTickets?: boolean;
  canResolveTickets?: boolean;
  canViewDigitalFootprint?: boolean; // Strictly false for SALES_AGENT
  canGrantCardAccess?: boolean; // Only for Managers & Admins
  canViewUnmaskedCards?: boolean; // Managers, Admins, Charging Ops, or authorized agents
  canSendPredefinedEmail?: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, PermissionCheck> = {
  SUPER_ADMIN: {
    canViewAllTenants: true,
    canManageUsers: true,
    canConfigureDepartments: true,
    canViewAuditLogs: true,
    canAssignLeads: true,
    canQualifyLeads: true,
    canTransitionToFinal: true,
    canProcessCharging: true,
    canValidateTransactions: true,
    canManageTickets: true,
    canResolveTickets: true,
    canViewDigitalFootprint: true,
    canGrantCardAccess: true,
    canViewUnmaskedCards: true,
    canSendPredefinedEmail: true,
  },
  ADMIN: {
    canViewAllTenants: false,
    canManageUsers: true,
    canConfigureDepartments: true,
    canViewAuditLogs: true,
    canAssignLeads: true,
    canQualifyLeads: true,
    canTransitionToFinal: true,
    canProcessCharging: true,
    canValidateTransactions: true,
    canManageTickets: true,
    canResolveTickets: true,
    canViewDigitalFootprint: true,
    canGrantCardAccess: true,
    canViewUnmaskedCards: true,
    canSendPredefinedEmail: true,
  },
  SALES_MANAGER: {
    canViewAllTenants: false,
    canManageUsers: false,
    canConfigureDepartments: false,
    canViewAuditLogs: true, // Manager can inspect audit trail
    canAssignLeads: true,
    canQualifyLeads: true,
    canTransitionToFinal: true,
    canProcessCharging: false,
    canValidateTransactions: false,
    canManageTickets: false,
    canResolveTickets: false,
    canViewDigitalFootprint: true,
    canGrantCardAccess: true,
    canViewUnmaskedCards: true,
    canSendPredefinedEmail: true,
  },
  SALES_AGENT: {
    canViewAllTenants: false,
    canManageUsers: false,
    canConfigureDepartments: false,
    canViewAuditLogs: false,
    canAssignLeads: false,
    canQualifyLeads: true,
    canTransitionToFinal: true,
    canProcessCharging: false,
    canValidateTransactions: false,
    canManageTickets: false,
    canResolveTickets: false,
    canViewDigitalFootprint: false, // Agent CANNOT see digital footprint
    canGrantCardAccess: false,
    canViewUnmaskedCards: false, // Masked by default unless manager grants clearance
    canSendPredefinedEmail: true,
  },
  CHARGING_MANAGER: {
    canViewAllTenants: false,
    canManageUsers: false,
    canConfigureDepartments: false,
    canViewAuditLogs: false,
    canAssignLeads: false,
    canQualifyLeads: false,
    canTransitionToFinal: false,
    canProcessCharging: true,
    canValidateTransactions: true,
    canManageTickets: false,
    canResolveTickets: false,
    canViewDigitalFootprint: true,
    canGrantCardAccess: true,
    canViewUnmaskedCards: true,
    canSendPredefinedEmail: false,
  },
  CHARGING_OPERATOR: {
    canViewAllTenants: false,
    canManageUsers: false,
    canConfigureDepartments: false,
    canViewAuditLogs: false,
    canAssignLeads: false,
    canQualifyLeads: false,
    canTransitionToFinal: false,
    canProcessCharging: true,
    canValidateTransactions: true,
    canManageTickets: false,
    canResolveTickets: false,
    canViewDigitalFootprint: false,
    canGrantCardAccess: false,
    canViewUnmaskedCards: true,
    canSendPredefinedEmail: false,
  },
  CS_MANAGER: {
    canViewAllTenants: false,
    canManageUsers: false,
    canConfigureDepartments: false,
    canViewAuditLogs: false,
    canAssignLeads: false,
    canQualifyLeads: false,
    canTransitionToFinal: false,
    canProcessCharging: false,
    canValidateTransactions: false,
    canManageTickets: true,
    canResolveTickets: true,
    canViewDigitalFootprint: true,
    canGrantCardAccess: false,
    canViewUnmaskedCards: false,
    canSendPredefinedEmail: true,
  },
  CS_AGENT: {
    canViewAllTenants: false,
    canManageUsers: false,
    canConfigureDepartments: false,
    canViewAuditLogs: false,
    canAssignLeads: false,
    canQualifyLeads: false,
    canTransitionToFinal: false,
    canProcessCharging: false,
    canValidateTransactions: false,
    canManageTickets: false,
    canResolveTickets: true,
    canViewDigitalFootprint: false,
    canGrantCardAccess: false,
    canViewUnmaskedCards: false,
    canSendPredefinedEmail: true,
  },
};

export const ROLE_DEPARTMENT_MAP: Record<Role, DepartmentType> = {
  SUPER_ADMIN: "ADMIN",
  ADMIN: "ADMIN",
  SALES_MANAGER: "SALES",
  SALES_AGENT: "SALES",
  CHARGING_MANAGER: "CHARGING",
  CHARGING_OPERATOR: "CHARGING",
  CS_MANAGER: "CUSTOMER_SERVICE",
  CS_AGENT: "CUSTOMER_SERVICE",
};

export function hasPermission(role: Role, permission: keyof PermissionCheck): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return Boolean(perms && perms[permission]);
}

export interface RoleMetadata {
  role: Role;
  title: string;
  department: DepartmentType;
  departmentId: string;
  level: number; // 1 = Super Admin, 2 = Admin, 3 = Manager, 4 = Agent/Operator
  description: string;
}

export const ROLE_HIERARCHY_CONFIG: Record<Role, RoleMetadata> = {
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    title: "Super Admin",
    department: "ADMIN",
    departmentId: "dept_admin",
    level: 1,
    description: "Highest platform authority across all tenants, compliance, and user hierarchy.",
  },
  ADMIN: {
    role: "ADMIN",
    title: "Operations Admin",
    department: "ADMIN",
    departmentId: "dept_admin",
    level: 2,
    description: "Operational management authority; can create department managers and agents.",
  },
  SALES_MANAGER: {
    role: "SALES_MANAGER",
    title: "Sales Manager / Director",
    department: "SALES",
    departmentId: "dept_sales",
    level: 3,
    description: "Supervises flight sales desk, card unmask clearance, and can create sales agents.",
  },
  CHARGING_MANAGER: {
    role: "CHARGING_MANAGER",
    title: "Charging & Ticketing Manager",
    department: "CHARGING",
    departmentId: "dept_charging",
    level: 3,
    description: "Manages airline payment settlements and can create charging operators.",
  },
  CS_MANAGER: {
    role: "CS_MANAGER",
    title: "Customer Service Manager",
    department: "CUSTOMER_SERVICE",
    departmentId: "dept_cs",
    level: 3,
    description: "Oversees VIP passenger onboarding, SLA desk, and can create CS concierge agents.",
  },
  SALES_AGENT: {
    role: "SALES_AGENT",
    title: "Sales Agent (Flight Specialist)",
    department: "SALES",
    departmentId: "dept_sales",
    level: 4,
    description: "Handles assigned flight inquiries, itinerary drafting, and customer verification.",
  },
  CHARGING_OPERATOR: {
    role: "CHARGING_OPERATOR",
    title: "Charging Operator (Card Settlement)",
    department: "CHARGING",
    departmentId: "dept_charging",
    level: 4,
    description: "Processes airline credit card charges and issues settled flight records.",
  },
  CS_AGENT: {
    role: "CS_AGENT",
    title: "CS Concierge Agent",
    department: "CUSTOMER_SERVICE",
    departmentId: "dept_cs",
    level: 4,
    description: "Fulfills passenger onboarding tickets, seat & meal preferences, and concierge requests.",
  },
};

export function getAllowedCreatableRoles(actorRole: Role): Role[] {
  if (actorRole === "SUPER_ADMIN") {
    return [
      "ADMIN",
      "SALES_MANAGER",
      "CHARGING_MANAGER",
      "CS_MANAGER",
      "SALES_AGENT",
      "CHARGING_OPERATOR",
      "CS_AGENT",
    ];
  }
  if (actorRole === "ADMIN") {
    return [
      "SALES_MANAGER",
      "CHARGING_MANAGER",
      "CS_MANAGER",
      "SALES_AGENT",
      "CHARGING_OPERATOR",
      "CS_AGENT",
    ];
  }
  if (actorRole === "SALES_MANAGER") {
    return ["SALES_AGENT"];
  }
  if (actorRole === "CHARGING_MANAGER") {
    return ["CHARGING_OPERATOR"];
  }
  if (actorRole === "CS_MANAGER") {
    return ["CS_AGENT"];
  }
  return [];
}

export function canCreateUserRole(
  actorRole: Role,
  targetRole: Role
): { allowed: boolean; reason?: string } {
  const allowed = getAllowedCreatableRoles(actorRole);
  if (allowed.includes(targetRole)) {
    return { allowed: true };
  }

  if (
    actorRole === "SALES_AGENT" ||
    actorRole === "CHARGING_OPERATOR" ||
    actorRole === "CS_AGENT"
  ) {
    return {
      allowed: false,
      reason: "Individual Agent / Operator roles cannot create new users.",
    };
  }

  if (
    actorRole === "ADMIN" &&
    (targetRole === "SUPER_ADMIN" || targetRole === "ADMIN")
  ) {
    return {
      allowed: false,
      reason:
        "Admins cannot create Super Admins or other Admins. Only Department Managers and Agents can be created.",
    };
  }

  if (actorRole.endsWith("_MANAGER") && (targetRole.endsWith("_MANAGER") || targetRole === "ADMIN" || targetRole === "SUPER_ADMIN")) {
    return {
      allowed: false,
      reason:
        "Department Managers can only create Agents/Operators for their department, not Admins or other Managers.",
    };
  }

  return {
    allowed: false,
    reason: `Role '${actorRole}' is not authorized to create '${targetRole}'. Hierarchy violation.`,
  };
}

export function canTransitionLead(
  role: Role,
  fromStatus: LeadStatus,
  toStatus: LeadStatus
): { allowed: boolean; reason?: string } {
  // Super Admin & Admin can override any transition
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return { allowed: true };
  }

  // Sales Department
  if (role === "SALES_MANAGER" || role === "SALES_AGENT") {
    const validSalesStatuses: LeadStatus[] = [
      "NEW",
      "FOLLOW_UP",
      "AUTHENTICATION_SENT",
      "QUALIFIED",
      "FINAL",
      "SALE",
      "CANCELLED",
      "ARCHIVED",
    ];

    if (validSalesStatuses.includes(toStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Sales role (${role}) cannot transition directly to non-sales status ${toStatus}`,
    };
  }

  // Charging Department
  if (role === "CHARGING_MANAGER" || role === "CHARGING_OPERATOR") {
    if ((fromStatus === "CHARGING" || fromStatus === "FINAL" || fromStatus === "SALE") && (toStatus === "SUCCESS" || toStatus === "FAILED")) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Charging role (${role}) only processes handoffs in CHARGING -> SUCCESS / FAILED states`,
    };
  }

  // CS Department
  if (role === "CS_MANAGER" || role === "CS_AGENT") {
    return {
      allowed: false,
      reason: `Customer Service roles manage ticket workflows and do not modify sales pipeline states`,
    };
  }

  return { allowed: false, reason: "Unauthorized role for state transition" };
}
