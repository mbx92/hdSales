import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const sparepartId = getRouterParam(event, 'id')

    if (!sparepartId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    const sparepart = await prisma.sparepart.findFirst({
        where: { id: sparepartId, userId },
        select: { id: true },
    })

    if (!sparepart) {
        throw createError({
            statusCode: 404,
            message: 'Sparepart tidak ditemukan',
        })
    }

    const adjustments = await prisma.stockAdjustment.findMany({
        where: { sparepartId },
        orderBy: { createdAt: 'desc' },
        take: 20,
    })

    return adjustments
})
