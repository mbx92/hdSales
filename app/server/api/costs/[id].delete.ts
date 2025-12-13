import prisma from '../../utils/prisma'
import { getLatestExchangeRate } from '../../utils/currency'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID biaya tidak valid',
        })
    }

    const cost = await prisma.cost.findUnique({
        where: { id },
        include: { motorcycle: true },
    })

    if (!cost) {
        throw createError({
            statusCode: 404,
            message: 'Biaya tidak ditemukan',
        })
    }

    // Delete the cost
    await prisma.cost.delete({
        where: { id },
    })

    // Recalculate motorcycle HPP if linked
    if (cost.motorcycleId) {
        const allCosts = await prisma.cost.findMany({
            where: { motorcycleId: cost.motorcycleId },
        })

        const totalCostIdr = allCosts.reduce((sum, c) => sum + c.amountIdr, 0)
        const motorcycle = cost.motorcycle!
        const exchangeRate = await getLatestExchangeRate('USD', 'IDR')

        let totalCost = totalCostIdr
        if (motorcycle.currency === 'USD') {
            totalCost = totalCostIdr / exchangeRate
        }

        await prisma.motorcycle.update({
            where: { id: cost.motorcycleId },
            data: { totalCost },
        })
    }

    return {
        success: true,
        message: 'Biaya berhasil dihapus',
    }
})
