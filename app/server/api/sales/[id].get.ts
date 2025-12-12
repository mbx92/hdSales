import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID penjualan tidak valid',
        })
    }

    const sale = await prisma.saleTransaction.findUnique({
        where: { id },
        include: {
            motorcycle: {
                include: {
                    costs: {
                        orderBy: { transactionDate: 'asc' },
                    },
                },
            },
            cashFlow: true,
        },
    })

    if (!sale) {
        throw createError({
            statusCode: 404,
            message: 'Penjualan tidak ditemukan',
        })
    }

    return sale
})
