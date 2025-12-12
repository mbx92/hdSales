import prisma from '../../utils/prisma'
import { getLatestExchangeRate } from '../../utils/currency'

export default defineEventHandler(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get counts
    const [
        totalMotorcycles,
        inspectionCount,
        availableCount,
        soldCount,
        monthlyIncome,
        monthlyOutcome,
        exchangeRate,
    ] = await Promise.all([
        prisma.motorcycle.count(),
        prisma.motorcycle.count({ where: { status: 'INSPECTION' } }),
        prisma.motorcycle.count({ where: { status: 'AVAILABLE' } }),
        prisma.motorcycle.count({ where: { status: 'SOLD' } }),
        prisma.cashFlow.aggregate({
            where: {
                type: 'INCOME',
                transactionDate: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { amountIdr: true },
        }),
        prisma.cashFlow.aggregate({
            where: {
                type: 'OUTCOME',
                transactionDate: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { amountIdr: true },
        }),
        getLatestExchangeRate('USD', 'IDR'),
    ])

    const totalIncomeIdr = monthlyIncome._sum.amountIdr || 0
    const totalOutcomeIdr = monthlyOutcome._sum.amountIdr || 0
    const netProfitIdr = totalIncomeIdr - totalOutcomeIdr

    // Calculate available inventory value
    const availableMotorcycles = await prisma.motorcycle.findMany({
        where: { status: 'AVAILABLE' },
    })

    const inventoryValueIdr = availableMotorcycles.reduce((sum, m) => {
        return sum + (m.currency === 'USD' ? m.totalCost * exchangeRate : m.totalCost)
    }, 0)

    return {
        motorcycles: {
            total: totalMotorcycles,
            inspection: inspectionCount,
            available: availableCount,
            sold: soldCount,
        },
        monthly: {
            income: totalIncomeIdr,
            outcome: totalOutcomeIdr,
            netProfit: netProfitIdr,
            period: {
                start: startOfMonth,
                end: endOfMonth,
            },
        },
        inventory: {
            value: inventoryValueIdr,
            count: availableCount,
        },
        exchangeRate,
    }
})
