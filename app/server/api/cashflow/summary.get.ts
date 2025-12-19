import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)

    const period = query.period as string || 'month' // day, week, month, year
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined

    const where: any = { userId }

    if (startDate || endDate) {
        where.transactionDate = {}
        if (startDate) where.transactionDate.gte = new Date(startDate)
        if (endDate) where.transactionDate.lte = new Date(endDate)
    } else {
        // Default to current month
        const now = new Date()
        where.transactionDate = {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        }
    }

    const cashflows = await prisma.cashFlow.findMany({
        where,
        orderBy: { transactionDate: 'asc' },
    })

    // Calculate totals
    const totalIncome = cashflows
        .filter(cf => cf.type === 'INCOME')
        .reduce((sum, cf) => sum + cf.amountIdr, 0)

    const totalOutcome = cashflows
        .filter(cf => cf.type === 'OUTCOME')
        .reduce((sum, cf) => sum + cf.amountIdr, 0)

    const netCashFlow = totalIncome - totalOutcome

    // Group by category
    const byCategory = cashflows.reduce((acc: any, cf) => {
        if (!acc[cf.category]) {
            acc[cf.category] = { income: 0, outcome: 0 }
        }
        if (cf.type === 'INCOME') {
            acc[cf.category].income += cf.amountIdr
        } else {
            acc[cf.category].outcome += cf.amountIdr
        }
        return acc
    }, {})

    return {
        summary: {
            totalIncome,
            totalOutcome,
            netCashFlow,
        },
        byCategory,
        period: {
            start: where.transactionDate.gte,
            end: where.transactionDate.lte,
        },
    }
})
