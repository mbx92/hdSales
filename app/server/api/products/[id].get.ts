import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID produk tidak valid',
        })
    }

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            costs: {
                orderBy: {
                    transactionDate: 'desc',
                },
            },
            saleTransaction: true,
        },
    })

    if (!product) {
        throw createError({
            statusCode: 404,
            message: 'Produk tidak ditemukan',
        })
    }

    return product
})
