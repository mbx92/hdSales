import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const sparepartId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!sparepartId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    const { quantity, type, reason } = body

    if (!quantity || quantity === 0) {
        throw createError({
            statusCode: 400,
            message: 'Quantity tidak boleh 0',
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

    const previousStock = sparepart.stock
    const newStock = previousStock + quantity
    const unitCost = sparepart.purchasePrice
    const totalAmount = Math.abs(quantity) * unitCost

    // Determine cashflow type and description
    let cashFlowType = 'OUTCOME'
    let cashFlowCategory = ''
    let cashFlowDescription = ''

    if (quantity > 0) {
        // Stock increase - purchase
        cashFlowCategory = 'SPAREPART_PURCHASE'
        cashFlowDescription = `Pembelian stok: ${sparepart.name} (${quantity} unit)`
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
