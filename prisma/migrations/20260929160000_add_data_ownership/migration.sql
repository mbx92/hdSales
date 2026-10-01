-- Add owner columns only on tables that already exist.
-- expenses has no earlier migration, so create that empty table when it
-- is missing. No existing table is dropped and no business row is deleted.

DO $$
DECLARE
    tables text[] := ARRAY[
        'motorcycles',
        'cash_flows',
        'exchange_rates',
        'expenses',
        'invoice_counters',
        'products',
        'sparepart_sales',
        'spareparts',
        'suppliers'
    ];
    target text;
    owner_id text;
    owner_count integer;
    null_count integer;
    null_details text := '';
    has_account_owner boolean;
BEGIN
    IF to_regclass('public.expenses') IS NULL THEN
        CREATE TABLE "expenses" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "category" TEXT NOT NULL,
            "description" TEXT NOT NULL,
            "amount" DOUBLE PRECISION NOT NULL,
            "currency" TEXT NOT NULL DEFAULT 'IDR',
            "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
            "amountIdr" DOUBLE PRECISION NOT NULL,
            "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "paymentMethod" TEXT,
            "receipt" TEXT,
            "notes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "cashFlowId" TEXT NOT NULL,
            CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
        );

        CREATE INDEX "expenses_category_idx" ON "expenses"("category");
        CREATE INDEX "expenses_transactionDate_idx" ON "expenses"("transactionDate");
        CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");

        IF to_regclass('public.cash_flows') IS NOT NULL THEN
            ALTER TABLE "expenses"
                ADD CONSTRAINT "expenses_cashFlowId_fkey"
                FOREIGN KEY ("cashFlowId") REFERENCES "cash_flows"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;

        IF to_regclass('public.users') IS NOT NULL THEN
            ALTER TABLE "expenses"
                ADD CONSTRAINT "expenses_userId_fkey"
                FOREIGN KEY ("userId") REFERENCES "users"("id")
                ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;

    FOREACH target IN ARRAY tables LOOP
        IF to_regclass(format('public.%I', target)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "userId" TEXT', target);
    END LOOP;

    IF to_regclass('public.users') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'accountOwnerId'
        ) INTO has_account_owner;

        IF has_account_owner THEN
            SELECT count(*) INTO owner_count
            FROM "users"
            WHERE role = 'OWNER' AND "accountOwnerId" IS NULL;

            IF owner_count = 1 THEN
                SELECT id INTO owner_id
                FROM "users"
                WHERE role = 'OWNER' AND "accountOwnerId" IS NULL;
            END IF;
        ELSE
            SELECT count(*) INTO owner_count
            FROM "users"
            WHERE role = 'OWNER';

            IF owner_count = 1 THEN
                SELECT id INTO owner_id
                FROM "users"
                WHERE role = 'OWNER';
            END IF;
        END IF;

        IF owner_id IS NULL AND (SELECT count(*) FROM "users") = 1 THEN
            SELECT id INTO owner_id FROM "users";
        END IF;
    END IF;

    IF owner_id IS NOT NULL THEN
        FOREACH target IN ARRAY tables LOOP
            IF to_regclass(format('public.%I', target)) IS NULL THEN
                CONTINUE;
            END IF;
            EXECUTE format('UPDATE %I SET "userId" = $1 WHERE "userId" IS NULL', target)
                USING owner_id;
        END LOOP;
    END IF;

    FOREACH target IN ARRAY tables LOOP
        IF to_regclass(format('public.%I', target)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('SELECT count(*) FROM %I WHERE "userId" IS NULL', target)
            INTO null_count;
        IF null_count > 0 THEN
            null_details := null_details || target || '=' || null_count::text || ', ';
        END IF;
    END LOOP;

    IF null_details <> '' THEN
        RAISE EXCEPTION
            'Migration stopped. No rows were deleted. Assign userId manually for: %',
            null_details;
    END IF;

    FOREACH target IN ARRAY tables LOOP
        IF to_regclass(format('public.%I', target)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I ALTER COLUMN "userId" SET NOT NULL', target);
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON %I ("userId")',
            target || '_userId_idx',
            target
        );
    END LOOP;

    IF to_regclass('public.motorcycles') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "motorcycles_userId_vin_key"
            ON "motorcycles"("userId", "vin");
    END IF;

    IF to_regclass('public.exchange_rates') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_userId_fromCurrency_toCurrency_effectiveDate_key"
            ON "exchange_rates"("userId", "fromCurrency", "toCurrency", "effectiveDate");
    END IF;

    IF to_regclass('public.invoice_counters') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "invoice_counters_userId_prefix_year_month_key"
            ON "invoice_counters"("userId", "prefix", "year", "month");
    END IF;

    IF to_regclass('public.products') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "products_userId_sku_key"
            ON "products"("userId", "sku");
    END IF;

    IF to_regclass('public.spareparts') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "spareparts_userId_sku_key"
            ON "spareparts"("userId", "sku");
    END IF;

    IF to_regclass('public.motorcycles') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'motorcycles_userId_fkey') THEN
        ALTER TABLE "motorcycles" ADD CONSTRAINT "motorcycles_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF to_regclass('public.cash_flows') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_flows_userId_fkey') THEN
        ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF to_regclass('public.exchange_rates') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exchange_rates_userId_fkey') THEN
        ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF to_regclass('public.expenses') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_userId_fkey') THEN
        ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF to_regclass('public.invoice_counters') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_counters_userId_fkey') THEN
        ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF to_regclass('public.products') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_userId_fkey') THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF to_regclass('public.spareparts') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spareparts_userId_fkey') THEN
        ALTER TABLE "spareparts" ADD CONSTRAINT "spareparts_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF to_regclass('public.suppliers') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_userId_fkey') THEN
        ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
