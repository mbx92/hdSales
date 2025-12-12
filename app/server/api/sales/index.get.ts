import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const skip = (page - 1) * limit

    const where: any = {}

    if (startDate || endDate) {
        where.saleDate = {}
        if (startDate) where.saleDate.gte = new Date(startDate)
        if (endDate) where.saleDate.lte = new Date(endDate)
    }

    const [sales, total] = await Promise.all([
        prisma.saleTransaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { saleDate: 'desc' },
            include: {
                motorcycle: {
                    select: {
                        id: true,
                        vin: true,
                        brand: true,
                        model: true,
                        year: true,
                        color: true,
                    },
                },
            },
        }),
        prisma.saleTransaction.count({ where }),
    ])

    return {
        data: sales,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
})
