import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID penjualan tidak valid',
        })
    }

    const sale = await prisma.productSale.findUnique({
        where: { id },
        include: {
            product: {
                include: {
                    costs: {
                        orderBy: { transactionDate: 'desc' },
                    },
                },
            },
            cashFlow: true,
        },
    })

    if (!sale) {
        throw createError({
            statusCode: 404,
            message: 'Penjualan produk tidak ditemukan',
        })
    }

    return sale
})
