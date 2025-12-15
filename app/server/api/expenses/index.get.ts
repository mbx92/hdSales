import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const where: any = {}

    // Filter by category
    if (query.category && query.category !== 'all') {
        where.category = query.category
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
        where.transactionDate = {}
        if (query.startDate) {
            where.transactionDate.gte = new Date(query.startDate as string)
        }
        if (query.endDate) {
            const endDate = new Date(query.endDate as string)
            endDate.setHours(23, 59, 59, 999)
            where.transactionDate.lte = endDate
        }
    }

    const expenses = await prisma.expense.findMany({
        where,
        orderBy: [
            { transactionDate: 'desc' },
            { createdAt: 'desc' }
        ]
    })

    // Get summary by category
    const categoryTotals = expenses.reduce((acc, exp) => {
        if (!acc[exp.category]) {
            acc[exp.category] = { count: 0, total: 0 }
        }
        acc[exp.category].count++
        acc[exp.category].total += exp.amountIdr
        return acc
    }, {} as Record<string, { count: number; total: number }>)

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amountIdr, 0)

    return {
        data: expenses,
        summary: {
            totalExpenses,
            count: expenses.length,
            categoryTotals
        }
    }
})
