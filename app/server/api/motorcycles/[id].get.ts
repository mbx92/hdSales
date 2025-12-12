import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
        })
    }

    const motorcycle = await prisma.motorcycle.findUnique({
        where: { id },
        include: {
            costs: {
                orderBy: { transactionDate: 'desc' },
            },
            saleTransaction: true,
        },
    })

    if (!motorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
        })
    }

    return motorcycle
})
