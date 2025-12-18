import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)

    const type = query.type as string | undefined
    const currency = query.currency as string | undefined
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const skip = (page - 1) * limit

    const where: any = { userId }

    if (type) {
        where.type = type
    }

    if (currency) {
        where.currency = currency
    }

    if (startDate || endDate) {
        where.transactionDate = {}
        if (startDate) where.transactionDate.gte = new Date(startDate)
        if (endDate) where.transactionDate.lte = new Date(endDate)
    }

    const [cashflows, total] = await Promise.all([
        prisma.cashFlow.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.cashFlow.count({ where }),
    ])

    return {
        data: cashflows,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
})
