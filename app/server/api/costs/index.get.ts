import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const component = query.component as string | undefined
    const motorcycleId = query.motorcycleId as string | undefined
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const skip = (page - 1) * limit

    const where: any = {}

    if (component) {
        where.component = component
    }

    if (motorcycleId) {
        where.motorcycleId = motorcycleId
    }

    if (startDate || endDate) {
        where.transactionDate = {}
        if (startDate) where.transactionDate.gte = new Date(startDate)
        if (endDate) where.transactionDate.lte = new Date(endDate)
    }

    const [costs, total] = await Promise.all([
        prisma.cost.findMany({
            where,
            skip,
            take: limit,
            orderBy: { transactionDate: 'desc' },
            include: {
                motorcycle: {
                    select: {
                        id: true,
                        vin: true,
                        model: true,
                        year: true,
                    },
                },
            },
        }),
        prisma.cost.count({ where }),
    ])

    return {
        data: costs,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
})
