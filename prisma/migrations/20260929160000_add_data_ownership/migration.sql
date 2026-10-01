-- Add owner columns to tables that already exist in production.
-- No table is dropped and no business row is deleted. Child records
-- (costs, sales, invoice lines, stock) stay attached to their parents.
-- Existing unique keys such as vin, sku, and invoice number are kept.
-- A NULL userId is filled from the single existing owner account.
-- Rows that already have a userId are left unchanged.

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
    owner_count INTEGER;
    null_details TEXT;
BEGIN
    SELECT count(*) INTO owner_count
    FROM "users"
    WHERE role = 'OWNER' AND "accountOwnerId" IS NULL;

    IF owner_count = 1 THEN
        SELECT id INTO owner_id
        FROM "users"
        WHERE role = 'OWNER' AND "accountOwnerId" IS NULL;
    ELSIF owner_count = 0 AND (SELECT count(*) FROM "users") = 1 THEN
        SELECT id INTO owner_id FROM "users";
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

    SELECT string_agg(table_name || '=' || null_count, ', ' ORDER BY table_name)
    INTO null_details
    FROM (
        SELECT 'motorcycles' AS table_name, count(*)::TEXT AS null_count FROM "motorcycles" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'cash_flows', count(*)::TEXT FROM "cash_flows" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'exchange_rates', count(*)::TEXT FROM "exchange_rates" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'expenses', count(*)::TEXT FROM "expenses" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'invoice_counters', count(*)::TEXT FROM "invoice_counters" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'products', count(*)::TEXT FROM "products" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'sparepart_sales', count(*)::TEXT FROM "sparepart_sales" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'spareparts', count(*)::TEXT FROM "spareparts" WHERE "userId" IS NULL
        UNION ALL
        SELECT 'suppliers', count(*)::TEXT FROM "suppliers" WHERE "userId" IS NULL
    ) null_rows
    WHERE null_count <> '0';

    IF null_details IS NOT NULL THEN
        RAISE EXCEPTION
            'Migration stopped. No rows were deleted. Assign userId manually for: %',
            null_details;
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
