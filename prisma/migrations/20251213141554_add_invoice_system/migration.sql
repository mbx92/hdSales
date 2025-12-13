/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `product_sales` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `sale_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "product_sales" ADD COLUMN     "invoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "sale_transactions" ADD COLUMN     "invoiceNumber" TEXT;

-- CreateTable
CREATE TABLE "invoice_counters" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_counters_prefix_year_month_key" ON "invoice_counters"("prefix", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "product_sales_invoiceNumber_key" ON "product_sales"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sale_transactions_invoiceNumber_key" ON "sale_transactions"("invoiceNumber");
