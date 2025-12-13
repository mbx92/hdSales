import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
    const motorcycleId = getRouterParam(event, 'id')
    const costId = getRouterParam(event, 'costId')

    if (!motorcycleId || !costId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
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
    const motorcycle = await prisma.motorcycle.findUnique({
        where: { id: motorcycleId },
        include: { saleTransaction: true },
    })

    if (motorcycle?.status === 'SOLD' && motorcycle.saleTransaction) {
        const profitIdr = motorcycle.saleTransaction.sellingPriceIdr - totalCostIdr
        let profit = profitIdr
        if (motorcycle.saleTransaction.currency === 'USD') {
            profit = profitIdr / motorcycle.saleTransaction.exchangeRate
        }
        const profitMargin = (profitIdr / motorcycle.saleTransaction.sellingPriceIdr) * 100

        await prisma.saleTransaction.update({
            where: { id: motorcycle.saleTransaction.id },
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
