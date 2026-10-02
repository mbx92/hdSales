import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'
import { getUserFromEvent } from '~/server/utils/jwt'
import { consumeFifo, lockSparepart } from '~/server/utils/sparepartFifo'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const currentUser = getUserFromEvent(event)
    const sparepartId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!sparepartId) {
        throw createError({ statusCode: 400, message: 'ID tidak valid' })
    }

    const type = String(body.type || '')
    const reason = body.reason ? String(body.reason).trim() : null
    const requestedQuantity = Math.abs(Number(body.quantity))

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
        throw createError({
            statusCode: 400,
            message: 'Quantity harus berupa bilangan bulat minimal 1',
        })
    }

    if (!['PURCHASE', 'ADJUSTMENT', 'LOSS', 'RETURN'].includes(type)) {
        throw createError({ statusCode: 400, message: 'Type tidak valid' })
    }

    const isStockIncrease = type === 'PURCHASE' || type === 'RETURN'
    if (currentUser?.role === 'CASHIER' && !isStockIncrease) {
        throw createError({
            statusCode: 403,
            message: 'Kasir hanya dapat menambah stok. Pengurangan stok dilakukan melalui POS.',
        })
    }

    const requestedUnitCost = Number(body.unitCost)
    if (isStockIncrease && (!Number.isFinite(requestedUnitCost) || requestedUnitCost < 0)) {
        throw createError({
            statusCode: 400,
            message: 'Harga beli per unit wajib diisi dan tidak boleh negatif',
        })
    }

    const receivedAt = body.purchaseDate ? new Date(`${body.purchaseDate}T00:00:00.000Z`) : new Date()
    if (Number.isNaN(receivedAt.getTime())) {
        throw createError({ statusCode: 400, message: 'Tanggal pembelian tidak valid' })
    }

    return await prisma.$transaction(async (tx) => {
        await lockSparepart(tx, sparepartId)

        const sparepart = await tx.sparepart.findFirst({
            where: { id: sparepartId, userId },
        })

        if (!sparepart) {
            throw createError({ statusCode: 404, message: 'Sparepart tidak ditemukan' })
        }
        if (sparepart.category === 'SERVICE') {
            throw createError({ statusCode: 400, message: 'Service/Jasa tidak memiliki stok' })
        }

        const quantity = isStockIncrease ? requestedQuantity : -requestedQuantity
        const previousStock = sparepart.stock
        const newStock = previousStock + quantity

        if (newStock < 0) {
            throw createError({
                statusCode: 400,
                message: `Pengurangan melebihi stok saat ini (${previousStock})`,
            })
        }

        let unitCost = requestedUnitCost
        let totalAmount = requestedQuantity * requestedUnitCost
        if (!isStockIncrease) {
            const fifo = await consumeFifo(tx, sparepartId, requestedQuantity)
            totalAmount = fifo.costOfGoods
            unitCost = requestedQuantity > 0 ? totalAmount / requestedQuantity : 0
        }

        let cashFlowCategory: string
        let cashFlowDescription: string
        if (isStockIncrease) {
            cashFlowCategory = 'SPAREPART_PURCHASE'
            cashFlowDescription = `${type === 'RETURN' ? 'Retur' : 'Pembelian'} stok: ${sparepart.name} (${requestedQuantity} unit)`
        } else {
            cashFlowCategory = type === 'LOSS' ? 'SPAREPART_LOSS' : 'SPAREPART_ADJUSTMENT'
            cashFlowDescription = `${type === 'LOSS' ? 'Kehilangan' : 'Penyesuaian'} stok: ${sparepart.name} (${requestedQuantity} unit)`
            if (reason) cashFlowDescription += ` - ${reason}`
        }

        const cashFlow = await tx.cashFlow.create({
            data: {
                userId,
                type: 'OUTCOME',
                amount: totalAmount,
                currency: sparepart.currency,
                exchangeRate: 1,
                amountIdr: totalAmount,
                description: cashFlowDescription,
                category: cashFlowCategory,
                transactionDate: isStockIncrease ? receivedAt : new Date(),
            },
        })

        const stockAdjustment = await tx.stockAdjustment.create({
            data: {
                sparepartId,
                quantity,
                type,
                reason,
                unitCost,
                totalAmount,
                previousStock,
                newStock,
                cashFlowId: cashFlow.id,
                createdAt: isStockIncrease ? receivedAt : undefined,
            },
        })

        if (isStockIncrease) {
            await tx.sparepartStockBatch.create({
                data: {
                    sparepartId,
                    stockAdjustmentId: stockAdjustment.id,
                    sourceType: type,
                    initialQuantity: requestedQuantity,
                    remainingQuantity: requestedQuantity,
                    unitCost,
                    receivedAt,
                },
            })
        }

        await tx.sparepart.update({
            where: { id: sparepartId },
            data: {
                stock: newStock,
                ...(type === 'PURCHASE' ? { purchasePrice: unitCost } : {}),
            },
        })

        return {
            success: true,
            stockAdjustment,
            cashFlow,
            previousStock,
            newStock,
            fifoCost: totalAmount,
        }
    })
})
