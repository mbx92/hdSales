import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const query = getQuery(event)
    const months = parseInt(query.months as string) || 6

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    // Get cash flows for the period for this user
    const cashflows = await prisma.cashFlow.findMany({
        where: {
            userId,
            transactionDate: { gte: startDate },
        },
        orderBy: { transactionDate: 'asc' },
    })

    // Group by month
    const monthlyData: Record<string, { income: number; outcome: number }> = {}

    for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyData[key] = { income: 0, outcome: 0 }
    }

    cashflows.forEach(cf => {
        const date = new Date(cf.transactionDate)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (monthlyData[key]) {
            if (cf.type === 'INCOME') {
                monthlyData[key].income += cf.amountIdr
            } else {
                monthlyData[key].outcome += cf.amountIdr
            }
        }
    })

    // Get sales with profit data for this user
    const sales = await prisma.saleTransaction.findMany({
        where: {
            motorcycle: { userId },
            saleDate: { gte: startDate },
        },
        include: {
            motorcycle: {
                select: { model: true, year: true },
            },
        },
        orderBy: { saleDate: 'desc' },
        take: 10,
    })

    // Profit by motorcycle
    const profitByMotorcycle = sales.map(sale => ({
        label: `${sale.motorcycle.model} ${sale.motorcycle.year}`,
        profit: sale.profit,
        margin: sale.profitMargin,
    }))

    // Status distribution for this user
    const statusDistribution = await prisma.motorcycle.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
    })

    // Cost breakdown by component for this user
    const costBreakdown = await prisma.cost.groupBy({
        by: ['component'],
        where: {
            motorcycle: { userId },
            transactionDate: { gte: startDate },
        },
        _sum: { amountIdr: true },
    })

    return {
        cashFlowTrend: Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month,
                ...data,
                net: data.income - data.outcome,
            })),
        profitByMotorcycle,
        statusDistribution: statusDistribution.map(s => ({
            status: s.status,
            count: s._count,
        })),
        costBreakdown: costBreakdown.map(c => ({
            component: c.component,
            total: c._sum.amountIdr || 0,
        })),
    }
})
