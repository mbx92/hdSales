import prisma from '../../../utils/prisma'
import { requireUser } from '../../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
        })
    }

    // Verify motorcycle belongs to user
    const motorcycle = await prisma.motorcycle.findFirst({
        where: { id, userId },
    })

    if (!motorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
        })
    }

    const costs = await prisma.cost.findMany({
        where: { motorcycleId: id },
        orderBy: { transactionDate: 'desc' },
        include: {
            cashFlow: true,
        },
    })

    return costs
})
