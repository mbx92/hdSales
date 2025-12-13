-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycles" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'Harley Davidson',
    "model" TEXT NOT NULL,
    "customModel" TEXT,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "mileage" INTEGER,
    "condition" TEXT NOT NULL DEFAULT 'USED',
    "currency" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellingPrice" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'INSPECTION',
    "ownerName" TEXT,
    "ownerPhone" TEXT,
    "ownerLocation" TEXT,
    "notes" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "documents" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motorcycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costs" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT,
    "component" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "amountIdr" DOUBLE PRECISION NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT,
    "receipt" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cashFlowId" TEXT NOT NULL,

    CONSTRAINT "costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_transactions" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "sellingPriceIdr" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "buyerAddress" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cashFlowId" TEXT NOT NULL,

    CONSTRAINT "sale_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flows" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "amountIdr" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spareparts" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 1,
    "supplierId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spareparts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sparepart_sales" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cashFlowId" TEXT,

    CONSTRAINT "sparepart_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sparepart_sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "sparepartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sparepart_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_effectiveDate_idx" ON "exchange_rates"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_effectiveDate_key" ON "exchange_rates"("fromCurrency", "toCurrency", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "motorcycles_vin_key" ON "motorcycles"("vin");

-- CreateIndex
CREATE INDEX "motorcycles_status_idx" ON "motorcycles"("status");

-- CreateIndex
CREATE INDEX "motorcycles_vin_idx" ON "motorcycles"("vin");

-- CreateIndex
CREATE INDEX "motorcycles_createdAt_idx" ON "motorcycles"("createdAt");

-- CreateIndex
CREATE INDEX "costs_motorcycleId_idx" ON "costs"("motorcycleId");

-- CreateIndex
CREATE INDEX "costs_component_idx" ON "costs"("component");

-- CreateIndex
CREATE INDEX "costs_transactionDate_idx" ON "costs"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "sale_transactions_motorcycleId_key" ON "sale_transactions"("motorcycleId");

-- CreateIndex
CREATE INDEX "sale_transactions_saleDate_idx" ON "sale_transactions"("saleDate");

-- CreateIndex
CREATE INDEX "cash_flows_type_transactionDate_idx" ON "cash_flows"("type", "transactionDate");

-- CreateIndex
CREATE INDEX "cash_flows_currency_idx" ON "cash_flows"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "spareparts_sku_key" ON "spareparts"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "sparepart_sales_invoiceNumber_key" ON "sparepart_sales"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "motorcycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "cash_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "motorcycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_transactions" ADD CONSTRAINT "sale_transactions_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "cash_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spareparts" ADD CONSTRAINT "spareparts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparepart_sales" ADD CONSTRAINT "sparepart_sales_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "cash_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparepart_sale_items" ADD CONSTRAINT "sparepart_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sparepart_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparepart_sale_items" ADD CONSTRAINT "sparepart_sale_items_sparepartId_fkey" FOREIGN KEY ("sparepartId") REFERENCES "spareparts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
