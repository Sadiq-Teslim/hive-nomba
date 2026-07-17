-- Merchant onboarding, WhatsApp activation, buyer scoping, and operational controls.

CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "MerchantTrustLevel" AS ENUM ('NEW', 'VERIFIED', 'TRUSTED', 'RESTRICTED', 'SUSPENDED');
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('NOT_CONNECTED', 'WAITING_FOR_ACTIVATION', 'CONNECTED', 'CODE_EXPIRED', 'CONNECTION_FAILED');
CREATE TYPE "MerchantSetupState" AS ENUM ('AWAITING_ACTIVATION', 'CONFIRMING_BUSINESS', 'CONFIGURING_FULFILMENT', 'CONFIGURING_POLICY', 'READY_TO_ADD_PRODUCT', 'ACTIVE');
CREATE TYPE "DeliveryOption" AS ENUM ('DELIVERY', 'PICKUP', 'BOTH');
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'PROCESSING', 'SETTLED', 'HELD_FOR_REVIEW', 'REVERSED');
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RiskEventStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'AWAITING_MERCHANT', 'UNDER_REVIEW', 'RESOLVED_FOR_BUYER', 'RESOLVED_FOR_MERCHANT', 'CLOSED');
CREATE TYPE "HumanHandoverStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'RETURNED_TO_HIVE', 'CLOSED');

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPATCHED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

ALTER TABLE "Merchant"
  ADD COLUMN "accountPhone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "businessPhone" TEXT,
  ADD COLUMN "cityState" TEXT,
  ADD COLUMN "deliveryOption" "DeliveryOption",
  ADD COLUMN "deliveryLocations" TEXT,
  ADD COLUMN "returnPolicy" TEXT,
  ADD COLUMN "cacRegistrationNumber" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "settlementBankName" TEXT,
  ADD COLUMN "settlementAccountNumber" TEXT,
  ADD COLUMN "settlementAccountName" TEXT,
  ADD COLUMN "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bankVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "businessRegistrationVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "trustLevel" "MerchantTrustLevel" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "storefrontSlug" TEXT,
  ADD COLUMN "storefrontCode" TEXT,
  ADD COLUMN "customerGreeting" TEXT,
  ADD COLUMN "whatsappConnectionStatus" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
  ADD COLUMN "whatsappConnectedAt" TIMESTAMP(3),
  ADD COLUMN "setupState" "MerchantSetupState" NOT NULL DEFAULT 'AWAITING_ACTIVATION',
  ADD COLUMN "activationCodeGeneratedAt" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD COLUMN "fulfilmentNote" TEXT,
  ADD COLUMN "dispatchCarrier" TEXT,
  ADD COLUMN "dispatchTrackingRef" TEXT,
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "dispatchedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);

ALTER TABLE "Conversation" ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT 'LOBBY';
UPDATE "Conversation" SET "scopeKey" = COALESCE("merchantId", 'LOBBY');
DROP INDEX IF EXISTS "Conversation_phone_party_key";

CREATE TABLE "ActivationCode" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codePreview" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "usedByPhone" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyerSession" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "customerId" TEXT,
  "phone" TEXT NOT NULL,
  "storeCode" TEXT,
  "activeCart" JSONB,
  "lastIntent" TEXT,
  "responder" TEXT NOT NULL DEFAULT 'HIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuyerSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderStatusEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerRef" TEXT,
  "txnId" TEXT,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "customerId" TEXT,
  "orderId" TEXT,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "evidenceUrl" TEXT,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskEvent" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "severity" "RiskSeverity" NOT NULL DEFAULT 'LOW',
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "status" "RiskEventStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HumanHandover" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "customerId" TEXT,
  "phone" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "HumanHandoverStatus" NOT NULL DEFAULT 'REQUESTED',
  "activeBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "HumanHandover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MerchantSession" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MerchantSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");
CREATE UNIQUE INDEX "Merchant_storefrontSlug_key" ON "Merchant"("storefrontSlug");
CREATE UNIQUE INDEX "Merchant_storefrontCode_key" ON "Merchant"("storefrontCode");
CREATE INDEX "Merchant_storefrontSlug_idx" ON "Merchant"("storefrontSlug");
CREATE INDEX "Merchant_storefrontCode_idx" ON "Merchant"("storefrontCode");
CREATE INDEX "Merchant_verificationStatus_idx" ON "Merchant"("verificationStatus");
CREATE INDEX "Merchant_whatsappConnectionStatus_idx" ON "Merchant"("whatsappConnectionStatus");
CREATE UNIQUE INDEX "Payment_txnId_key" ON "Payment"("txnId");
CREATE INDEX "Order_merchantId_reference_idx" ON "Order"("merchantId", "reference");
CREATE INDEX "Order_merchantId_status_idx" ON "Order"("merchantId", "status");
CREATE UNIQUE INDEX "Conversation_scopeKey_phone_party_key" ON "Conversation"("scopeKey", "phone", "party");
CREATE UNIQUE INDEX "ActivationCode_codeHash_key" ON "ActivationCode"("codeHash");
CREATE INDEX "ActivationCode_merchantId_idx" ON "ActivationCode"("merchantId");
CREATE INDEX "ActivationCode_expiresAt_idx" ON "ActivationCode"("expiresAt");
CREATE INDEX "ActivationCode_usedByPhone_idx" ON "ActivationCode"("usedByPhone");
CREATE UNIQUE INDEX "BuyerSession_merchantId_phone_key" ON "BuyerSession"("merchantId", "phone");
CREATE INDEX "BuyerSession_phone_idx" ON "BuyerSession"("phone");
CREATE INDEX "BuyerSession_merchantId_idx" ON "BuyerSession"("merchantId");
CREATE INDEX "OrderStatusEvent_orderId_idx" ON "OrderStatusEvent"("orderId");
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");
CREATE INDEX "PaymentEvent_providerRef_idx" ON "PaymentEvent"("providerRef");
CREATE INDEX "PaymentEvent_txnId_idx" ON "PaymentEvent"("txnId");
CREATE INDEX "Dispute_merchantId_idx" ON "Dispute"("merchantId");
CREATE INDEX "Dispute_merchantId_status_idx" ON "Dispute"("merchantId", "status");
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");
CREATE INDEX "RiskEvent_merchantId_idx" ON "RiskEvent"("merchantId");
CREATE INDEX "RiskEvent_merchantId_status_idx" ON "RiskEvent"("merchantId", "status");
CREATE INDEX "RiskEvent_severity_idx" ON "RiskEvent"("severity");
CREATE INDEX "AuditLog_merchantId_idx" ON "AuditLog"("merchantId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "HumanHandover_merchantId_idx" ON "HumanHandover"("merchantId");
CREATE INDEX "HumanHandover_merchantId_status_idx" ON "HumanHandover"("merchantId", "status");
CREATE INDEX "HumanHandover_phone_idx" ON "HumanHandover"("phone");
CREATE UNIQUE INDEX "MerchantSession_tokenHash_key" ON "MerchantSession"("tokenHash");
CREATE INDEX "MerchantSession_merchantId_idx" ON "MerchantSession"("merchantId");
CREATE INDEX "MerchantSession_expiresAt_idx" ON "MerchantSession"("expiresAt");

ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanHandover" ADD CONSTRAINT "HumanHandover_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanHandover" ADD CONSTRAINT "HumanHandover_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MerchantSession" ADD CONSTRAINT "MerchantSession_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
