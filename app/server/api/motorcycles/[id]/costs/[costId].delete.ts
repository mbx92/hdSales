import prisma from '../../../../utils/prisma'
import { requireUser } from '../../../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const motorcycleId = getRouterParam(event, 'id')
    const costId = getRouterParam(event, 'costId')

    if (!motorcycleId || !costId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    // Verify motorcycle belongs to user
    const motorcycle = await prisma.motorcycle.findFirst({
        where: { id: motorcycleId, userId },
    })

    if (!motorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
        })
    }

    // Verify cost belongs to this motorcycle
    const existingCost = await prisma.cost.findUnique({
        where: { id: costId },
    })

    if (!existingCost || existingCost.motorcycleId !== motorcycleId) {
        throw createError({
            statusCode: 404,
            message: 'Biaya tidak ditemukan',
        })
    }

    // Delete cost
    await prisma.cost.delete({
        where: { id: costId },
    })

    // Delete associated cashflow if exists
    if (existingCost.cashFlowId) {
        await prisma.cashFlow.delete({
            where: { id: existingCost.cashFlowId },
        })
    }

    // Recalculate motorcycle totalCost
    const allCosts = await prisma.cost.findMany({
        where: { motorcycleId },
    })
    const totalCostIdr = allCosts.reduce((sum, c) => sum + c.amountIdr, 0)

    await prisma.motorcycle.update({
        where: { id: motorcycleId },
        data: { totalCost: totalCostIdr },
    })

    // If motorcycle is sold, recalculate profit
    const updatedMotorcycle = await prisma.motorcycle.findUnique({
        where: { id: motorcycleId },
        include: { saleTransaction: true },
    })

    if (updatedMotorcycle?.status === 'SOLD' && updatedMotorcycle.saleTransaction) {
        const profitIdr = updatedMotorcycle.saleTransaction.sellingPriceIdr - totalCostIdr
        let profit = profitIdr
        if (updatedMotorcycle.saleTransaction.currency === 'USD') {
            profit = profitIdr / updatedMotorcycle.saleTransaction.exchangeRate
        }
        const profitMargin = (profitIdr / updatedMotorcycle.saleTransaction.sellingPriceIdr) * 100

        await prisma.saleTransaction.update({
            where: { id: updatedMotorcycle.saleTransaction.id },
            data: {
                totalCost: totalCostIdr,
                profit,
                profitMargin,
            },
        })

        await prisma.motorcycle.update({
            where: { id: motorcycleId },
            data: { profit },
        })
    }

    return { success: true, message: 'Biaya berhasil dihapus' }
})
