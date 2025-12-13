import prisma from '../../utils/prisma'

export default defineEventHandler(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get counts and financial data
    const [
        totalMotorcycles,
        inspectionCount,
        availableCount,
        soldCount,
        monthlyIncome,
        monthlyOutcome,
        monthlyMotorcycleProfit,
        monthlySparepartSales,
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
        // Get total profit from motorcycle sales (margin-based)
        prisma.saleTransaction.aggregate({
            where: {
                saleDate: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { profit: true },
        }),
        // Get sparepart sales with items and sparepart data for margin calculation
        prisma.sparepartSale.findMany({
            where: {
                saleDate: { gte: startOfMonth, lte: endOfMonth },
            },
            include: {
                items: {
                    include: {
                        sparepart: {
                            select: { purchasePrice: true }
                        }
                    }
                }
            }
        }),
    ])

    const totalIncomeIdr = monthlyIncome._sum.amountIdr || 0
    const totalOutcomeIdr = monthlyOutcome._sum.amountIdr || 0

    // Calculate motorcycle profit (margin from sales)
    const motorcycleProfit = monthlyMotorcycleProfit._sum?.profit || 0

    // Calculate sparepart profit (margin = sellingPrice - purchasePrice per item)
    const sparepartProfit = monthlySparepartSales.reduce((total, sale) => {
        return total + sale.items.reduce((itemTotal, item) => {
            const margin = (item.unitPrice - item.sparepart.purchasePrice) * item.quantity
            return itemTotal + margin
        }, 0)
    }, 0)

    // Total profit = motorcycle margin + sparepart margin
    const totalProfitIdr = motorcycleProfit + sparepartProfit

    // Calculate available inventory value (all in IDR now)
    const availableMotorcycles = await prisma.motorcycle.findMany({
        where: { status: 'AVAILABLE' },
    })

    const inventoryValueIdr = availableMotorcycles.reduce((sum, m) => {
        return sum + m.totalCost
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
            netProfit: totalProfitIdr, // Now uses total margin from motorcycle + sparepart sales
            motorcycleProfit,
            sparepartProfit,
            period: {
                start: startOfMonth,
                end: endOfMonth,
            },
        },
        inventory: {
            value: inventoryValueIdr,
            count: availableCount,
        },
    }
})

