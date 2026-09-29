-- Complete the per-owner data model that predates the migration history.
-- Every statement is safe to run against databases where these columns were
-- previously added manually.

ALTER TABLE "motorcycles" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "cash_flows" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "invoice_counters" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "sparepart_sales" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "spareparts" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "userId" TEXT;

DO $$
DECLARE
    owner_id TEXT;
    rows_need_owner BOOLEAN;
BEGIN
    SELECT "id" INTO owner_id
    FROM "users"
    WHERE "role" = 'OWNER'
    ORDER BY "createdAt" ASC
    LIMIT 1;

    SELECT
        EXISTS (SELECT 1 FROM "motorcycles" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "cash_flows" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "exchange_rates" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "expenses" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "invoice_counters" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "products" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "sparepart_sales" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "spareparts" WHERE "userId" IS NULL) OR
        EXISTS (SELECT 1 FROM "suppliers" WHERE "userId" IS NULL)
    INTO rows_need_owner;

    IF rows_need_owner AND owner_id IS NULL THEN
        RAISE EXCEPTION 'Cannot assign existing data: no OWNER user exists';
    END IF;

    IF owner_id IS NOT NULL THEN
        UPDATE "motorcycles" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "cash_flows" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "exchange_rates" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "expenses" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "invoice_counters" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "products" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "sparepart_sales" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "spareparts" SET "userId" = owner_id WHERE "userId" IS NULL;
        UPDATE "suppliers" SET "userId" = owner_id WHERE "userId" IS NULL;
    END IF;
END $$;

ALTER TABLE "motorcycles" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "cash_flows" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "exchange_rates" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "expenses" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "invoice_counters" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "sparepart_sales" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "spareparts" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX IF EXISTS "exchange_rates_fromCurrency_toCurrency_effectiveDate_key";
DROP INDEX IF EXISTS "invoice_counters_prefix_year_month_key";
DROP INDEX IF EXISTS "motorcycles_vin_idx";
DROP INDEX IF EXISTS "motorcycles_vin_key";
DROP INDEX IF EXISTS "products_sku_key";
DROP INDEX IF EXISTS "spareparts_sku_key";

CREATE INDEX IF NOT EXISTS "motorcycles_userId_idx" ON "motorcycles"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "motorcycles_userId_vin_key" ON "motorcycles"("userId", "vin");
CREATE INDEX IF NOT EXISTS "cash_flows_userId_idx" ON "cash_flows"("userId");
CREATE INDEX IF NOT EXISTS "exchange_rates_userId_idx" ON "exchange_rates"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_userId_fromCurrency_toCurrency_effectiveDate_key"
    ON "exchange_rates"("userId", "fromCurrency", "toCurrency", "effectiveDate");
CREATE INDEX IF NOT EXISTS "expenses_userId_idx" ON "expenses"("userId");
CREATE INDEX IF NOT EXISTS "invoice_counters_userId_idx" ON "invoice_counters"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_counters_userId_prefix_year_month_key"
    ON "invoice_counters"("userId", "prefix", "year", "month");
CREATE INDEX IF NOT EXISTS "products_userId_idx" ON "products"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "products_userId_sku_key" ON "products"("userId", "sku");
CREATE INDEX IF NOT EXISTS "sparepart_sales_userId_idx" ON "sparepart_sales"("userId");
CREATE INDEX IF NOT EXISTS "spareparts_userId_idx" ON "spareparts"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "spareparts_userId_sku_key" ON "spareparts"("userId", "sku");
CREATE INDEX IF NOT EXISTS "suppliers_userId_idx" ON "suppliers"("userId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'motorcycles_userId_fkey') THEN
        ALTER TABLE "motorcycles" ADD CONSTRAINT "motorcycles_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_flows_userId_fkey') THEN
        ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exchange_rates_userId_fkey') THEN
        ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_userId_fkey') THEN
        ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_counters_userId_fkey') THEN
        ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_userId_fkey') THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spareparts_userId_fkey') THEN
        ALTER TABLE "spareparts" ADD CONSTRAINT "spareparts_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_userId_fkey') THEN
        ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
