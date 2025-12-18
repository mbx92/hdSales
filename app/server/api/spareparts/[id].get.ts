import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id

    const sparepart = await prisma.sparepart.findFirst({
        where: { id, userId },
        include: {
            supplier: true,
            saleItems: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    sale: true
                }
            }
        }
    })

    if (!sparepart) {
        throw createError({
            statusCode: 404,
            message: 'Sparepart tidak ditemukan'
        })
    }

    return sparepart
})
