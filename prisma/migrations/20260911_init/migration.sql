-- PostgreSQL Migration for Enterprise CRM
-- Supports JSONB metadata, Clickstream, SPF/DKIM verification, and Audit logging

-- Create Enums
CREATE TYPE "Role" AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'SALES_AGENT',
  'CHARGING_MANAGER',
  'CHARGING_OPERATOR',
  'CS_MANAGER',
  'CS_AGENT'
);

CREATE TYPE "DepartmentType" AS ENUM (
  'ADMIN',
  'SALES',
  'CHARGING',
  'CUSTOMER_SERVICE'
);

CREATE TYPE "LeadStatus" AS ENUM (
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'FINAL',
  'CHARGING',
  'SUCCESS',
  'FAILED',
  'ARCHIVED'
);

CREATE TYPE "VerificationStatus" AS ENUM (
  'PASS',
  'FAIL',
  'NEUTRAL',
  'NONE'
);

CREATE TYPE "TransactionStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE "TicketPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TYPE "TicketStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "TicketType" AS ENUM (
  'ONBOARDING',
  'BILLING',
  'TECHNICAL',
  'GENERAL'
);

-- Tenants Table
CREATE TABLE "Tenant" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Departments Table
CREATE TABLE "Department" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "type" "DepartmentType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Department_tenantId_type_unique" UNIQUE ("tenantId", "type")
);

-- Users Table
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "departmentId" TEXT REFERENCES "Department"("id") ON DELETE SET NULL,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "avatarUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table
CREATE TABLE "Lead" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "assignedToId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "dealValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- Lead Footprint Table (JSONB Clickstream + Headers)
CREATE TABLE "LeadFootprint" (
  "id" TEXT PRIMARY KEY,
  "leadId" TEXT NOT NULL UNIQUE REFERENCES "Lead"("id") ON DELETE CASCADE,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT NOT NULL,
  "referrer" TEXT,
  "country" TEXT,
  "city" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmTerm" TEXT,
  "utmContent" TEXT,
  "clickstream" JSONB NOT NULL,
  "rawHeaders" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "LeadFootprint_utmSource_idx" ON "LeadFootprint"("utmSource");

-- Email Verification Table
CREATE TABLE "EmailVerification" (
  "id" TEXT PRIMARY KEY,
  "leadId" TEXT NOT NULL UNIQUE REFERENCES "Lead"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "spfResult" "VerificationStatus" NOT NULL DEFAULT 'NONE',
  "dkimResult" "VerificationStatus" NOT NULL DEFAULT 'NONE',
  "dmarcResult" "VerificationStatus" NOT NULL DEFAULT 'NONE',
  "mxRecordExists" BOOLEAN NOT NULL DEFAULT false,
  "smtpCheckValid" BOOLEAN NOT NULL DEFAULT false,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "rawDetails" JSONB,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE "Customer" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "leadId" TEXT UNIQUE REFERENCES "Lead"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "tier" TEXT NOT NULL DEFAULT 'ENTERPRISE',
  "healthScore" INTEGER NOT NULL DEFAULT 100,
  "onboardingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- Transactions Table
CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "leadId" TEXT NOT NULL REFERENCES "Lead"("id") ON DELETE CASCADE,
  "customerId" TEXT REFERENCES "Customer"("id") ON DELETE SET NULL,
  "processedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT NOT NULL DEFAULT 'CREDIT_CARD',
  "gatewayTxnId" TEXT,
  "verificationChecklist" JSONB,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Transaction_tenantId_status_idx" ON "Transaction"("tenantId", "status");

-- Tickets Table
CREATE TABLE "Ticket" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "customerId" TEXT REFERENCES "Customer"("id") ON DELETE SET NULL,
  "leadId" TEXT REFERENCES "Lead"("id") ON DELETE SET NULL,
  "assignedToId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "type" "TicketType" NOT NULL DEFAULT 'ONBOARDING',
  "slaDeadline" TIMESTAMP(3) NOT NULL,
  "isSlaBreached" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Ticket_tenantId_status_idx" ON "Ticket"("tenantId", "status");
CREATE INDEX "Ticket_slaDeadline_idx" ON "Ticket"("slaDeadline");

-- Activity Logs Table
CREATE TABLE "ActivityLog" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromState" TEXT,
  "toState" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ActivityLog_tenantId_entity_idx" ON "ActivityLog"("tenantId", "entityType", "entityId");

-- Audit Logs Table
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "actorEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");
