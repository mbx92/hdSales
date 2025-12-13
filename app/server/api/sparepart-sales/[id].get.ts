import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Sale ID is required'
        })
    }

    const sale = await prisma.sparepartSale.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    sparepart: {
                        select: {
                            name: true,
                            sku: true,
                            brand: true,
                            category: true
                        }
                    }
                }
            }
        }
    })

    if (!sale) {
        throw createError({
            statusCode: 404,
            message: 'Penjualan tidak ditemukan'
        })
    }

    return sale
})
