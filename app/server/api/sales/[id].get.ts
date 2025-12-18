import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID penjualan tidak valid',
        })
    }

    const sale = await prisma.saleTransaction.findFirst({
        where: { 
            id,
            motorcycle: { userId }
        },
        include: {
            motorcycle: {
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
            message: 'Penjualan tidak ditemukan',
        })
    }

    return sale
})
