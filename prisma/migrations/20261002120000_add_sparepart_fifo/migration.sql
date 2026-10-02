-- Store immutable HPP snapshots on sale items. Historical rows are backfilled
-- from the best information available before FIFO was introduced: the current
-- master purchase price and the proportional transaction discount.
-- Some early installations received stock_adjustments through db push rather
-- than a migration. Create it here when rebuilding a database from migrations.
CREATE TABLE IF NOT EXISTS "stock_adjustments" (
    "id" TEXT NOT NULL,
    "sparepartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashFlowId" TEXT,
    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_adjustments_sparepartId_fkey"
        FOREIGN KEY ("sparepartId") REFERENCES "spareparts"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_adjustments_cashFlowId_fkey"
        FOREIGN KEY ("cashFlowId") REFERENCES "cash_flows"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_adjustments_sparepartId_idx"
    ON "stock_adjustments"("sparepartId");
CREATE INDEX IF NOT EXISTS "stock_adjustments_type_idx"
    ON "stock_adjustments"("type");
CREATE INDEX IF NOT EXISTS "stock_adjustments_createdAt_idx"
    ON "stock_adjustments"("createdAt");

ALTER TABLE "sparepart_sale_items"
    ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "netRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "costOfGoods" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "profit" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "sparepart_sale_items" AS item
SET
    "discountAmount" = CASE
        WHEN sale."subtotal" > 0 THEN sale."discount" * item."subtotal" / sale."subtotal"
        ELSE 0
    END,
    "netRevenue" = item."subtotal" - CASE
        WHEN sale."subtotal" > 0 THEN sale."discount" * item."subtotal" / sale."subtotal"
        ELSE 0
    END,
    "costOfGoods" = sparepart."purchasePrice" * item."quantity",
    "profit" = item."subtotal" - CASE
        WHEN sale."subtotal" > 0 THEN sale."discount" * item."subtotal" / sale."subtotal"
        ELSE 0
    END - (sparepart."purchasePrice" * item."quantity")
FROM "sparepart_sales" AS sale, "spareparts" AS sparepart
WHERE item."saleId" = sale."id"
  AND item."sparepartId" = sparepart."id";

CREATE TABLE "sparepart_stock_batches" (
    "id" TEXT NOT NULL,
    "sparepartId" TEXT NOT NULL,
    "stockAdjustmentId" TEXT,
    "sourceType" TEXT NOT NULL,
    "initialQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sparepart_stock_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sparepart_sale_item_costs" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sparepart_sale_item_costs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sparepart_stock_batches_stockAdjustmentId_key"
    ON "sparepart_stock_batches"("stockAdjustmentId");
CREATE INDEX "sparepart_stock_batches_sparepartId_receivedAt_idx"
    ON "sparepart_stock_batches"("sparepartId", "receivedAt");
CREATE INDEX "sparepart_stock_batches_sparepartId_remainingQuantity_idx"
    ON "sparepart_stock_batches"("sparepartId", "remainingQuantity");
CREATE INDEX "sparepart_sale_item_costs_saleItemId_idx"
    ON "sparepart_sale_item_costs"("saleItemId");
CREATE INDEX "sparepart_sale_item_costs_stockBatchId_idx"
    ON "sparepart_sale_item_costs"("stockBatchId");

ALTER TABLE "sparepart_stock_batches"
    ADD CONSTRAINT "sparepart_stock_batches_sparepartId_fkey"
    FOREIGN KEY ("sparepartId") REFERENCES "spareparts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sparepart_stock_batches"
    ADD CONSTRAINT "sparepart_stock_batches_stockAdjustmentId_fkey"
    FOREIGN KEY ("stockAdjustmentId") REFERENCES "stock_adjustments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sparepart_sale_item_costs"
    ADD CONSTRAINT "sparepart_sale_item_costs_saleItemId_fkey"
    FOREIGN KEY ("saleItemId") REFERENCES "sparepart_sale_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sparepart_sale_item_costs"
    ADD CONSTRAINT "sparepart_sale_item_costs_stockBatchId_fkey"
    FOREIGN KEY ("stockBatchId") REFERENCES "sparepart_stock_batches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing on-hand stock becomes an opening FIFO layer. This is intentionally
-- not attached to an old adjustment because pre-FIFO sales did not record the
-- consumed purchase layer reliably.
INSERT INTO "sparepart_stock_batches" (
    "id", "sparepartId", "sourceType", "initialQuantity",
    "remainingQuantity", "unitCost", "receivedAt", "createdAt", "updatedAt"
)
SELECT
    'opening_' || md5(sparepart."id"),
    sparepart."id",
    'OPENING_BALANCE',
    sparepart."stock",
    sparepart."stock",
    sparepart."purchasePrice",
    sparepart."createdAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "spareparts" AS sparepart
WHERE sparepart."stock" > 0
  AND sparepart."category" <> 'SERVICE';
