import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const where: any = {}

    // Filter by status
    if (query.status) {
        where.status = query.status
    }

    // Filter by category
    if (query.category) {
        where.category = query.category
    }

    // Search by name or SKU
    if (query.search) {
        where.OR = [
            { name: { contains: query.search as string, mode: 'insensitive' } },
            { sku: { contains: query.search as string, mode: 'insensitive' } },
        ]
    }

    const products = await prisma.product.findMany({
        where,
        include: {
            costs: true,
            saleTransaction: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    })

    return products
})
