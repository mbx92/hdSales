import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)
    const search = query.search as string
    const category = query.category as string
    const status = query.status as string

    const where: any = { userId }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
        ]
    }

    if (category && category !== 'ALL') {
        where.category = category
    }

    if (status && status !== 'ALL') {
        where.status = status
    }

    const spareparts = await prisma.sparepart.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            supplier: {
                select: { name: true }
            }
        }
    })

    return spareparts
})
