import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID produk tidak valid',
        })
    }

    const product = await prisma.product.findFirst({
        where: { id, userId },
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
