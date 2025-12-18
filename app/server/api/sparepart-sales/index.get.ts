import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)
    const page = parseInt(query.page as string || '1')
    const limit = parseInt(query.limit as string || '10')
    const search = query.search as string
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    const where: any = { userId }

    if (search) {
        where.OR = [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
        ]
    }

    if (startDate || endDate) {
        where.saleDate = {}
        if (startDate) where.saleDate.gte = new Date(startDate)
        if (endDate) where.saleDate.lte = new Date(endDate)
    }

    const [sales, total] = await Promise.all([
        prisma.sparepartSale.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { saleDate: 'desc' },
            include: {
                items: {
                    include: {
                        sparepart: {
                            select: { name: true, sku: true }
                        }
                    }
                }
            }
        }),
        prisma.sparepartSale.count({ where })
    ])

    return {
        data: sales,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }
})
