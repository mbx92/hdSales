import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)

    const type = query.type as string || 'motorcycle' // motorcycle, sparepart, product, all
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const skip = (page - 1) * limit

    const dateFilter: any = {}
    if (startDate || endDate) {
        if (startDate) dateFilter.gte = new Date(startDate)
        if (endDate) dateFilter.lte = new Date(endDate)
    }

    // Handle motorcycle sales - filter by motorcycle owner
    if (type === 'motorcycle') {
        const where: any = {
            motorcycle: { userId }
        }
        if (startDate || endDate) {
            where.saleDate = dateFilter
        }

        const [sales, total] = await Promise.all([
            prisma.saleTransaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
            data: sales.map(sale => ({
                ...sale,
                type: 'motorcycle'
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }
    }

    // Handle product sales - filter by product owner
    if (type === 'product') {
        const where: any = {
            product: { userId }
        }
        if (startDate || endDate) {
            where.saleDate = dateFilter
        }

        const [sales, total] = await Promise.all([
            prisma.productSale.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            category: true,
                            customCategory: true,
                        }
                    }
                }
            }),
            prisma.productSale.count({ where }),
        ])

        return {
            data: sales.map(sale => ({
                ...sale,
                type: 'product'
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }
    }

    // Handle combined sales (all) - filter by user
    const motorcycleWhere: any = { motorcycle: { userId } }
    const sparepartWhere: any = { userId }

    if (startDate || endDate) {
        motorcycleWhere.saleDate = dateFilter
        sparepartWhere.saleDate = dateFilter
    }

    const [motorcycleSales, sparepartSales, motorcycleTotal, sparepartTotal] = await Promise.all([
        prisma.saleTransaction.findMany({
            where: motorcycleWhere,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        prisma.sparepartSale.findMany({
            where: sparepartWhere,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        prisma.saleTransaction.count({ where: motorcycleWhere }),
        prisma.sparepartSale.count({ where: sparepartWhere }),
    ])

    // Combine and sort by date
    const combined = [
        ...motorcycleSales.map(sale => ({ ...sale, type: 'motorcycle' })),
        ...sparepartSales.map(sale => ({ ...sale, type: 'sparepart' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Paginate combined results
    const paginatedData = combined.slice(skip, skip + limit)
    const total = motorcycleTotal + sparepartTotal

    return {
        data: paginatedData,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
})
