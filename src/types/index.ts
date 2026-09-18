export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES_MANAGER"
  | "SALES_AGENT"
  | "CHARGING_MANAGER"
  | "CHARGING_OPERATOR"
  | "CS_MANAGER"
  | "CS_AGENT";

export type DepartmentType =
  | "ADMIN"
  | "SALES"
  | "CHARGING"
  | "CUSTOMER_SERVICE";

export type LeadStatus =
  | "NEW"
  | "FOLLOW_UP"
  | "AUTHENTICATION_SENT"
  | "QUALIFIED"
  | "FINAL"
  | "SALE"
  | "CANCELLED"
  | "CHARGING"
  | "SUCCESS"
  | "FAILED"
  | "ARCHIVED";

export type VerificationStatus = "PASS" | "FAIL" | "NEUTRAL" | "NONE";

export type TransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type TicketType = "ONBOARDING" | "BILLING" | "TECHNICAL" | "GENERAL";

export interface User {
  id: string;
  tenantId: string;
  departmentId?: string;
  username?: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Passenger {
  id: string;
  fullName: string;
  passportNumber: string;
  passportExpiry?: string;
  nationality?: string;
  dob: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  type: "ADULT" | "CHILD" | "INFANT";
  seatPreference?: string;
  mealPreference?: string;
  specialAssistance?: string;
  eTicketNumber?: string;
}

export interface FlightSegment {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string; // e.g. "JFK"
  destination: string; // e.g. "LHR"
  departureDate: string; // YYYY-MM-DD
  departureTime?: string; // e.g. "08:30 AM"
  arrivalDate?: string;
  arrivalTime?: string;
  cabinClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  seatNumber?: string;
}

export interface FlightBooking {
  origin: string; // e.g. "JFK (New York)"
  destination: string; // e.g. "LHR (London Heathrow)"
  tripType: "ROUND_TRIP" | "ONE_WAY" | "MULTI_CITY";
  departureDate: string;
  returnDate?: string;
  airline: string;
  flightNumber: string;
  cabinClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  passengers: Passenger[];
  pnrCode?: string;
  flights?: FlightSegment[];
  ticketPrice?: number; // Cost of ticket / Net Fare
  salePrice?: number; // Custom Sale Price / Gross Total
  mco?: number; // Miscellaneous Charges Order = salePrice - ticketPrice (Amount earned by agent)
}

export interface CardDetails {
  cardholderName: string;
  cardNumber: string; // Stored full securely, masked in presentation unless authorized
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardType: "VISA" | "MASTERCARD" | "AMEX" | "DISCOVER";
  isAccessGrantedToAgent: boolean;
  grantedByManagerId?: string;
  grantedByManagerName?: string;
  grantedAt?: string;
  accessExpiresAt?: string; // Expiration timestamp for agent visibility (3-minute window)
  accessDurationMinutes?: number; // Duration of access granted (default: 3 minutes)
}

export interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  bodyTemplate: string;
  type: "AUTHENTICATION" | "CONFIRMATION" | "FOLLOW_UP" | "CANCELLATION";
}

export interface ClickstreamEvent {
  timestamp: string;
  event: string;
  url: string;
  dwellTimeSeconds?: number;
  metadata?: Record<string, unknown>;
  remark?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  isAutoLogged?: boolean;
}

export interface LeadFootprint {
  id: string;
  leadId: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  city?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  clickstream: ClickstreamEvent[];
  rawHeaders?: Record<string, string>;
  createdAt: string;
}

export interface EmailVerification {
  id: string;
  leadId: string;
  email: string;
  spfResult: VerificationStatus;
  dkimResult: VerificationStatus;
  dmarcResult: VerificationStatus;
  mxRecordExists: boolean;
  smtpCheckValid: boolean;
  score: number; // 0 to 100
  rawDetails?: Record<string, unknown>;
  verifiedAt: string;
}

export interface Lead {
  id: string;
  bookingNumber: number; // Simple sequential auto-incremented booking number (e.g. 1001, 1002, 1003...)
  bookingId?: string; // Optional alias string representation (e.g. "#1001" or "BK-1001")
  tenantId: string;
  assignedToId?: string;
  assignedToName?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  dealValue: number;
  ticketPrice?: number; // Custom ticket cost / net fare
  salePrice?: number; // Custom sale price / gross total sold to client
  mco?: number; // MCO = salePrice - ticketPrice (Actual profit earned by agent)
  currency: string;
  notes?: string;
  bookingDetails?: FlightBooking;
  cardDetails?: CardDetails;
  authEmailSent?: boolean;
  authCallConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
  footprint?: LeadFootprint;
  emailVerification?: EmailVerification;
  transactionCount?: number;
}

export interface TransactionVerificationChecklist {
  identityVerified: boolean;
  fundsAvailable: boolean;
  fraudRiskScore: number;
  avsMatch: boolean;
  cvvMatch: boolean;
  complianceCleared: boolean;
}

export interface Transaction {
  id: string;
  tenantId: string;
  leadId: string;
  leadName?: string;
  customerId?: string;
  processedById?: string;
  processedByName?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: string;
  gatewayTxnId?: string;
  verificationChecklist?: TransactionVerificationChecklist;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  leadId?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tier: string;
  healthScore: number;
  onboardingStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  assignedToId?: string;
  assignedToName?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  type: TicketType;
  slaDeadline: string;
  isSlaBreached: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  tenantId: string;
  entityType: "LEAD" | "TRANSACTION" | "TICKET" | "CUSTOMER" | "USER" | "SYSTEM";
  entityId: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  fromState?: string;
  toState?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId?: string;
  actorEmail: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: "SUCCESS" | "DENIED" | "ERROR";
  payload?: Record<string, unknown>;
  timestamp: string;
}
