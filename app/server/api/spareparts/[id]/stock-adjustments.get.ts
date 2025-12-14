import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const sparepartId = getRouterParam(event, 'id')

    if (!sparepartId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    const adjustments = await prisma.stockAdjustment.findMany({
        where: { sparepartId },
        orderBy: { createdAt: 'desc' },
        take: 20,
    })

    return adjustments
})
