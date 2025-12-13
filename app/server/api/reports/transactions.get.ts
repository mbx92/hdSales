import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const type = query.type as string | undefined // INCOME, OUTCOME, or all
    const category = query.category as string | undefined
    const dateRange = query.dateRange as string | undefined // week, month, 3months, 6months, year, all
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined

    const where: any = {}

    // Filter by type
    if (type && type !== 'all') {
        where.type = type
    }

    // Filter by category
    if (category && category !== 'all') {
        where.category = category
    }

    // Calculate date range
    const now = new Date()
    let dateStart: Date | undefined
    let dateEnd: Date = now

    if (dateRange && dateRange !== 'all') {
        switch (dateRange) {
            case 'week':
                dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'month':
                dateStart = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case '3months':
                dateStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
                break
            case '6months':
                dateStart = new Date(now.getFullYear(), now.getMonth() - 6, 1)
                break
            case 'year':
                dateStart = new Date(now.getFullYear(), 0, 1)
                break
        }
    }

    // Custom date range override
    if (startDate) {
        dateStart = new Date(startDate)
    }
    if (endDate) {
        dateEnd = new Date(endDate)
        dateEnd.setHours(23, 59, 59, 999)
    }

    if (dateStart) {
        where.transactionDate = {
            gte: dateStart,
            lte: dateEnd,
        }
    }

    // Get all transactions matching filters
    const transactions = await prisma.cashFlow.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
    })

    // Calculate summary
    const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amountIdr, 0)

    const totalOutcome = transactions
        .filter(t => t.type === 'OUTCOME')
        .reduce((sum, t) => sum + t.amountIdr, 0)

    const netBalance = totalIncome - totalOutcome

    // Group by category
    const categoryTotals: Record<string, { income: number; outcome: number }> = {}

    transactions.forEach(t => {
        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = { income: 0, outcome: 0 }
        }
        if (t.type === 'INCOME') {
            categoryTotals[t.category].income += t.amountIdr
        } else {
            categoryTotals[t.category].outcome += t.amountIdr
        }
    })

    // Get unique categories for filter dropdown
    const categories = await prisma.cashFlow.findMany({
        select: { category: true },
        distinct: ['category'],
    })

    return {
        data: transactions,
        summary: {
            totalIncome,
            totalOutcome,
            netBalance,
            transactionCount: transactions.length,
        },
        categoryTotals,
        categories: categories.map(c => c.category),
        filters: {
            type: type || 'all',
            category: category || 'all',
            dateRange: dateRange || 'all',
            startDate: dateStart?.toISOString(),
            endDate: dateEnd.toISOString(),
        },
    }
})
