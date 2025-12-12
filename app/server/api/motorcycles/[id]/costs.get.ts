import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
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
