import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)
    const search = query.search as string

    const where: any = { userId }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
        ]
    }

    const suppliers = await prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { spareparts: true }
            }
        }
    })

    return suppliers
})
