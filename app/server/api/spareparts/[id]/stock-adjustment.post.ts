import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'
import { getUserFromEvent } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const currentUser = getUserFromEvent(event)
    const sparepartId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!sparepartId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    const { type, reason } = body
    const requestedQuantity = Math.abs(Number(body.quantity))

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
        throw createError({
            statusCode: 400,
            message: 'Quantity harus berupa bilangan bulat minimal 1',
        })
    }

    if (!type || !['PURCHASE', 'ADJUSTMENT', 'LOSS', 'RETURN'].includes(type)) {
        throw createError({
            statusCode: 400,
            message: 'Type tidak valid',
        })
    }

    // Get sparepart - verify ownership
    const sparepart = await prisma.sparepart.findFirst({
        where: { id: sparepartId, userId },
    })

    if (!sparepart) {
        throw createError({
            statusCode: 404,
            message: 'Sparepart tidak ditemukan',
        })
    }

    // Check if SERVICE category - skip stock tracking
    if (sparepart.category === 'SERVICE') {
        throw createError({
            statusCode: 400,
            message: 'Service/Jasa tidak memiliki stok',
        })
    }

    // The adjustment type is the source of truth for stock direction.
    // Users enter an absolute quantity; reduction types are normalized here.
    const isStockIncrease = type === 'PURCHASE' || type === 'RETURN'

    if (currentUser?.role === 'CASHIER' && !isStockIncrease) {
        throw createError({
            statusCode: 403,
            message: 'Kasir hanya dapat menambah stok. Pengurangan stok dilakukan melalui POS.',
        })
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

    const unitCost = sparepart.purchasePrice
    const totalAmount = requestedQuantity * unitCost

    // Determine cashflow type and description
    let cashFlowType = 'OUTCOME'
    let cashFlowCategory = ''
    let cashFlowDescription = ''

    if (isStockIncrease) {
        // Stock increase - purchase/return
        cashFlowCategory = 'SPAREPART_PURCHASE'
        cashFlowDescription = `${type === 'RETURN' ? 'Retur' : 'Pembelian'} stok: ${sparepart.name} (${requestedQuantity} unit)`
    } else {
        // Stock decrease - loss/adjustment
        cashFlowCategory = type === 'LOSS' ? 'SPAREPART_LOSS' : 'SPAREPART_ADJUSTMENT'
        cashFlowDescription = `${type === 'LOSS' ? 'Kehilangan' : 'Penyesuaian'} stok: ${sparepart.name} (${Math.abs(quantity)} unit)`
        if (reason) {
            cashFlowDescription += ` - ${reason}`
        }
    }

    // Create cashflow entry with userId
    const cashFlow = await prisma.cashFlow.create({
        data: {
            userId,
            type: cashFlowType,
            amount: totalAmount,
            currency: sparepart.currency,
            exchangeRate: 1,
            amountIdr: totalAmount,
            description: cashFlowDescription,
            category: cashFlowCategory,
            transactionDate: new Date(),
        },
    })

    // Create stock adjustment record
    const stockAdjustment = await prisma.stockAdjustment.create({
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
        },
    })

    // Update sparepart stock
    await prisma.sparepart.update({
        where: { id: sparepartId },
        data: { stock: newStock },
    })

    return {
        success: true,
        stockAdjustment,
        cashFlow,
        previousStock,
        newStock,
    }
})
