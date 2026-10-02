import type { Prisma } from '@prisma/client'

type TransactionClient = Prisma.TransactionClient

export type FifoAllocation = {
    stockBatchId: string
    quantity: number
    unitCost: number
    totalCost: number
}

/**
 * PostgreSQL row lock used by every stock-changing operation. Keeping the
 * aggregate stock row locked prevents two POS requests from consuming the same
 * FIFO layer concurrently.
 */
export async function lockSparepart(tx: TransactionClient, sparepartId: string) {
    await tx.$queryRaw`SELECT "id" FROM "spareparts" WHERE "id" = ${sparepartId} FOR UPDATE`
}

export async function consumeFifo(
    tx: TransactionClient,
    sparepartId: string,
    quantity: number,
): Promise<{ costOfGoods: number; allocations: FifoAllocation[] }> {
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('FIFO quantity must be a positive integer')
    }

    const batches = await tx.sparepartStockBatch.findMany({
        where: {
            sparepartId,
            remainingQuantity: { gt: 0 },
        },
        orderBy: [
            { receivedAt: 'asc' },
            { createdAt: 'asc' },
            { id: 'asc' },
        ],
    })

    const available = batches.reduce((sum, batch) => sum + batch.remainingQuantity, 0)
    if (available < quantity) {
        throw createError({
            statusCode: 409,
            message: `Layer stok FIFO tidak cukup. Tersedia ${available}, dibutuhkan ${quantity}. Muat ulang data lalu coba lagi.`,
        })
    }

    let outstanding = quantity
    const allocations: FifoAllocation[] = []

    for (const batch of batches) {
        if (outstanding === 0) break

        const consumed = Math.min(outstanding, batch.remainingQuantity)
        const totalCost = consumed * batch.unitCost

        await tx.sparepartStockBatch.update({
            where: { id: batch.id },
            data: { remainingQuantity: { decrement: consumed } },
        })

        allocations.push({
            stockBatchId: batch.id,
            quantity: consumed,
            unitCost: batch.unitCost,
            totalCost,
        })
        outstanding -= consumed
    }

    return {
        costOfGoods: allocations.reduce((sum, allocation) => sum + allocation.totalCost, 0),
        allocations,
    }
}

export async function saveFifoAllocations(
    tx: TransactionClient,
    saleItemId: string,
    allocations: FifoAllocation[],
) {
    if (allocations.length === 0) return

    await tx.sparepartSaleItemCost.createMany({
        data: allocations.map(allocation => ({
            saleItemId,
            ...allocation,
        })),
    })
}

/** Restore every layer consumed by a sale item before that item is deleted. */
export async function restoreSaleItemFifo(
    tx: TransactionClient,
    saleItem: {
        id: string
        sparepartId: string
        quantity: number
        costOfGoods: number
        createdAt: Date
    },
) {
    const allocations = await tx.sparepartSaleItemCost.findMany({
        where: { saleItemId: saleItem.id },
    })

    if (allocations.length > 0) {
        for (const allocation of allocations) {
            await tx.sparepartStockBatch.update({
                where: { id: allocation.stockBatchId },
                data: { remainingQuantity: { increment: allocation.quantity } },
            })
        }
        return
    }

    // Sales created before FIFO have no batch allocations. Restoring them as a
    // dedicated layer preserves their saved historical HPP.
    const unitCost = saleItem.quantity > 0
        ? saleItem.costOfGoods / saleItem.quantity
        : 0

    await tx.sparepartStockBatch.create({
        data: {
            sparepartId: saleItem.sparepartId,
            sourceType: 'LEGACY_SALE_REVERSAL',
            initialQuantity: saleItem.quantity,
            remainingQuantity: saleItem.quantity,
            unitCost,
            receivedAt: saleItem.createdAt,
        },
    })
}

/**
 * Adjust an existing item's FIFO allocation without rewriting other sales.
 * Reductions restore the newest layer used by this item first; increases consume
 * the oldest layer currently available.
 */
export async function resizeSaleItemFifo(
    tx: TransactionClient,
    saleItemId: string,
    sparepartId: string,
    oldQuantity: number,
    newQuantity: number,
    legacyUnitCost: number,
) {
    const difference = newQuantity - oldQuantity

    if (difference > 0) {
        const consumed = await consumeFifo(tx, sparepartId, difference)
        await saveFifoAllocations(tx, saleItemId, consumed.allocations)
    } else if (difference < 0) {
        let quantityToRestore = Math.abs(difference)
        const allocations = await tx.sparepartSaleItemCost.findMany({
            where: { saleItemId },
            include: { stockBatch: true },
            orderBy: [
                { stockBatch: { receivedAt: 'desc' } },
                { createdAt: 'desc' },
            ],
        })

        for (const allocation of allocations) {
            if (quantityToRestore === 0) break
            const restored = Math.min(quantityToRestore, allocation.quantity)

            await tx.sparepartStockBatch.update({
                where: { id: allocation.stockBatchId },
                data: { remainingQuantity: { increment: restored } },
            })

            if (restored === allocation.quantity) {
                await tx.sparepartSaleItemCost.delete({ where: { id: allocation.id } })
            } else {
                const quantity = allocation.quantity - restored
                await tx.sparepartSaleItemCost.update({
                    where: { id: allocation.id },
                    data: {
                        quantity,
                        totalCost: quantity * allocation.unitCost,
                    },
                })
            }
            quantityToRestore -= restored
        }

        // A legacy item has no allocations. Represent the restored portion as a
        // real layer so aggregate stock and FIFO layers stay reconciled.
        if (quantityToRestore > 0) {
            await tx.sparepartStockBatch.create({
                data: {
                    sparepartId,
                    sourceType: 'LEGACY_SALE_CORRECTION',
                    initialQuantity: quantityToRestore,
                    remainingQuantity: quantityToRestore,
                    unitCost: legacyUnitCost,
                    receivedAt: new Date(),
                },
            })
        }
    }

    const totals = await tx.sparepartSaleItemCost.aggregate({
        where: { saleItemId },
        _sum: { totalCost: true },
    })

    // Existing pre-FIFO quantity still carries its immutable legacy unit cost.
    const allocatedQuantity = await tx.sparepartSaleItemCost.aggregate({
        where: { saleItemId },
        _sum: { quantity: true },
    })
    const legacyQuantity = Math.max(0, newQuantity - (allocatedQuantity._sum.quantity || 0))

    return (totals._sum.totalCost || 0) + (legacyQuantity * legacyUnitCost)
}
