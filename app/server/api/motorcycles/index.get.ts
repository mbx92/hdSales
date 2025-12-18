import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)

    const status = query.status as string | undefined
    const search = query.search as string | undefined
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const skip = (page - 1) * limit

    const where: any = { userId }

    if (status) {
        where.status = status
    }

    if (search) {
        where.OR = [
            { vin: { contains: search } },
            { model: { contains: search } },
            { ownerName: { contains: search } },
        ]
    }

    const [motorcycles, total] = await Promise.all([
        prisma.motorcycle.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { costs: true },
                },
            },
        }),
        prisma.motorcycle.count({ where }),
    ])

    return {
        data: motorcycles,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
})
