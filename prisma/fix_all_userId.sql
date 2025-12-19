-- =====================================================
-- Migration Script: Add missing userId columns to ALL tables
-- userId: cmj81gbkt000057xczkrji052
-- =====================================================

-- 1. EXCHANGE_RATES
ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "exchange_rates" SET "userId" = 'cmj81gbkt000057xczkrji052' WHERE "userId" IS NULL;
ALTER TABLE "exchange_rates" ALTER COLUMN "userId" SET NOT NULL;

-- 2. PRODUCTS  
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "products" SET "userId" = 'cmj81gbkt000057xczkrji052' WHERE "userId" IS NULL;
ALTER TABLE "products" ALTER COLUMN "userId" SET NOT NULL;

-- 3. SPAREPARTS
ALTER TABLE "spareparts" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "spareparts" SET "userId" = 'cmj81gbkt000057xczkrji052' WHERE "userId" IS NULL;
ALTER TABLE "spareparts" ALTER COLUMN "userId" SET NOT NULL;

-- 4. SUPPLIERS
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "suppliers" SET "userId" = 'cmj81gbkt000057xczkrji052' WHERE "userId" IS NULL;
ALTER TABLE "suppliers" ALTER COLUMN "userId" SET NOT NULL;

-- 5. CASH_FLOWS
ALTER TABLE "cash_flows" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "cash_flows" SET "userId" = 'cmj81gbkt000057xczkrji052' WHERE "userId" IS NULL;
ALTER TABLE "cash_flows" ALTER COLUMN "userId" SET NOT NULL;

-- 6. EXPENSES
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "expenses" SET "userId" = 'cmj81gbkt000057xczkrji052' WHERE "userId" IS NULL;
ALTER TABLE "expenses" ALTER COLUMN "userId" SET NOT NULL;

-- 7. INVOICE_COUNTERS
ALTER TABLE "invoice_counters" ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE "invoice_counters" SET "userId" = 'cmj81gbkt000057xczkrji052' WHERE "userId" IS NULL;
ALTER TABLE "invoice_counters" ALTER COLUMN "userId" SET NOT NULL;

-- Create indexes for all userId columns
CREATE INDEX IF NOT EXISTS "exchange_rates_userId_idx" ON "exchange_rates"("userId");
CREATE INDEX IF NOT EXISTS "products_userId_idx" ON "products"("userId");
CREATE INDEX IF NOT EXISTS "spareparts_userId_idx" ON "spareparts"("userId");
CREATE INDEX IF NOT EXISTS "suppliers_userId_idx" ON "suppliers"("userId");
CREATE INDEX IF NOT EXISTS "cash_flows_userId_idx" ON "cash_flows"("userId");
CREATE INDEX IF NOT EXISTS "expenses_userId_idx" ON "expenses"("userId");
CREATE INDEX IF NOT EXISTS "invoice_counters_userId_idx" ON "invoice_counters"("userId");
