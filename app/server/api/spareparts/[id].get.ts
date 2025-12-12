import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    const sparepart = await prisma.sparepart.findUnique({
        where: { id },
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
