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
  | "TICKETING"
  | "DUPLICATE"
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
  rcExtension?: string; // Assigned RingCentral extension (e.g. "101", "102")
  rcDirectNumber?: string; // RingCentral direct inward dialing (DID) number
  rcStatus?: "AVAILABLE" | "BUSY" | "ON_CALL" | "OFFLINE";
  createdAt: string;
}

export interface Passenger {
  id: string;
  fullName: string;
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  dob: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | string;
  type: "ADULT" | "CHILD" | "INFANT" | string;
  seatPreference?: string;
  mealPreference?: string;
  specialAssistance?: string;
  eTicketNumber?: string;
}

export interface AttachedDocument {
  id: string;
  name: string;
  size?: string;
  type: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface FlightSegment {
  id: string;
  airline: string;
  airlineCode?: string;
  flightNumber: string;
  confirmationNumber?: string; // e.g. "AA-94812" or "YAK33K"
  eTicketNumber?: string;
  origin: string; // e.g. "ELP" or "JFK"
  originName?: string; // e.g. "El Paso International Airport"
  destination: string; // e.g. "ORD" or "LHR"
  destinationName?: string; // e.g. "O'Hare International Airport"
  departureTerminal?: string;
  arrivalTerminal?: string; // e.g. "Terminal 3"
  departureDate: string; // e.g. "Wed, Jul 16" or YYYY-MM-DD
  departureTime?: string; // e.g. "06:00 AM"
  arrivalDate?: string;
  arrivalTime?: string; // e.g. "10:14 AM"
  duration?: string; // e.g. "03h 14m"
  cabinClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST" | string;
  seatNumber?: string;
  fareBasis?: string; // e.g. "GUA0ZNN1"
  flightClass?: string; // e.g. "G"
  fareType?: string; // e.g. "SP"
  legGroup?: "DEPART" | "RETURN" | "MULTI";
  routeLabel?: string; // e.g. "El Paso To Chicago"
  layoverAfter?: {
    duration: string; // e.g. "03h 21m"
    city: string; // e.g. "Chicago"
  };
}

export interface FlightBooking {
  origin: string; // e.g. "JFK (New York)"
  destination: string; // e.g. "LHR (London Heathrow)"
  tripType: "ROUND_TRIP" | "ONE_WAY" | "MULTI_CITY";
  departureDate: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  returnDate?: string;
  airline: string;
  flightNumber: string;
  cabinClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST" | string;
  passengers: Passenger[];
  pnrCode?: string;
  confirmationNumber?: string; // Flight confirmation number
  flights?: FlightSegment[];
  documents?: AttachedDocument[];
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
  alternateEmail?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  status: LeadStatus;
  dealValue: number;
  ticketPrice?: number; // Custom ticket cost / net fare
  salePrice?: number; // Custom sale price / gross total sold to client
  mco?: number; // MCO = salePrice - ticketPrice (Actual profit earned by agent)
  currency: string;
  notes?: string;
  confirmationNumber?: string;
  documents?: AttachedDocument[];
  bookingDetails?: FlightBooking;
  cardDetails?: CardDetails;
  authEmailSent?: boolean;
  authCallConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
  footprint?: LeadFootprint;
  emailVerification?: EmailVerification;
  transactionCount?: number;
  ppcSource?: string;
  ppcCampaign?: string;
  ppcKeyword?: string;
  ppcChannel?: "CALL_INBOUND" | "LANDING_PAGE_FORM" | "SEARCH_AD" | "RETARGETING" | string;
  ppcGclid?: string;
  lastRemarkSnippet?: string;
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

export type ChatMessageType =
  | "TEXT"
  | "HIERARCHY_UPDATE"
  | "LEAD_ESCALATION"
  | "APPROVAL_REQUEST"
  | "APPROVAL_RESPONSE"
  | "SYSTEM_ANNOUNCEMENT";

export interface ChatMessage {
  id: string;
  tenantId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  senderAvatarUrl?: string;
  recipientId?: string; // If set, this is a 1-on-1 direct hierarchy message
  recipientName?: string;
  channelId?: string; // e.g. "general", "sales-team", "charging-ops", "hierarchy-broadcasts"
  messageType: ChatMessageType;
  content: string;
  leadId?: string;
  leadBookingNumber?: number;
  leadPnr?: string;
  leadDealValue?: number;
  metadata?: Record<string, unknown>;
  readBy: string[];
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  department?: DepartmentType;
  icon?: string;
  minRole?: Role;
  unreadCount?: number;
}

export type CallDirection = "INBOUND" | "OUTBOUND";
export type CallStatus = "RINGING" | "ANSWERED" | "COMPLETED" | "MISSED" | "REJECTED" | "VOICEMAIL";
export type CallSentiment = "POSITIVE" | "NEUTRAL" | "URGENT" | "FRUSTRATED";

export type CallDisposition =
  | "BOOKING_INQUIRY"
  | "FLIGHT_RESERVATION_SALE"
  | "PAYMENT_CONFIRMATION"
  | "ITINERARY_CHANGE"
  | "CANCELLATION_REQUEST"
  | "FOLLOW_UP_REQUIRED"
  | "PRICE_QUOTE_GIVEN"
  | "LEFT_VOICEMAIL"
  | "CUSTOMER_BUSY"
  | "WRONG_NUMBER"
  | "NOT_INTERESTED"
  | "GENERAL_SUPPORT";

export interface CallLog {
  id: string;
  tenantId: string;
  agentId: string;
  agentName: string;
  agentExtension: string; // The extension assigned to the agent (e.g. "101")
  agentRole?: Role;
  leadId?: string; // Linked CRM lead ID if matched or created
  leadBookingNumber?: number; // Sequential booking number (e.g. 1001)
  callerNumber: string; // From number (e.g. customer phone or agent DID)
  calleeNumber: string; // To number (e.g. destination number or extension)
  direction: CallDirection; // INBOUND or OUTBOUND
  status: CallStatus;
  startTime: string;
  endTime?: string;
  durationSeconds: number; // Call duration in seconds
  disposition?: CallDisposition | string; // Disposition chosen by the agent
  notes?: string; // Detailed notes entered by agent during/after the call
  leadDetailsEntered: boolean; // Flag indicating if agent entered lead details
  rcSessionId?: string; // RingCentral telephony session ID
  transferredToExtension?: string; // Target extension if transferred
  transferredToAgentName?: string; // Target agent name if transferred
  transferredFromExtension?: string; // Origin extension if transferred
  transferredAt?: string; // Transfer timestamp
  isMuted?: boolean; // In-call mute flag
  telephonyStatus?: string; // e.g. "Ringing", "Connected", "Disconnected", "Transferred"
  recordingUrl?: string; // Mock or RingCentral recording URL
  sentiment?: CallSentiment;
  createdAt: string;
  updatedAt: string;
}

export interface RingCentralConfig {
  clientId?: string;
  serverUrl?: string;
  mainPhoneNumber?: string;
  isConnected: boolean;
  activeExtensionsCount: number;
}

