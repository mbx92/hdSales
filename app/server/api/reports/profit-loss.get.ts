import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    // Parse date filters
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date()

    const dateRange = query.dateRange as string || 'month'

    switch (dateRange) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
        case '3months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
            break
        case '6months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
            break
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
        case 'custom':
            startDate = query.startDate ? new Date(query.startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1)
            endDate = query.endDate ? new Date(query.endDate as string) : new Date()
            break
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Get motorcycle sales with costs
    const motorcycleSales = await prisma.saleTransaction.findMany({
        where: {
            saleDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            motorcycle: {
                select: {
                    brand: true,
                    model: true,
                    customModel: true,
                    year: true,
                    costs: {
                        select: {
                            component: true,
                            description: true,
                            amountIdr: true,
                        },
                    },
                },
            },
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
        ],
    })

    // Get product sales with costs
    const productSales = await prisma.productSale.findMany({
        where: {
            saleDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            product: {
                select: {
                    name: true,
                    category: true,
                    customCategory: true,
                    costs: {
                        select: {
                            component: true,
                            description: true,
                            amountIdr: true,
                        },
                    },
                },
            },
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
        ],
    })

    // Get expenses
    const expenses = await prisma.expense.findMany({
        where: {
            transactionDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: [
            { transactionDate: 'desc' },
            { createdAt: 'desc' },
        ],
    })

    // Calculate expense breakdown by category
    const expenseCategories: Record<string, { count: number; total: number }> = {}
    expenses.forEach(exp => {
        if (!expenseCategories[exp.category]) {
            expenseCategories[exp.category] = { count: 0, total: 0 }
        }
        expenseCategories[exp.category].count++
        expenseCategories[exp.category].total += exp.amountIdr
    })

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amountIdr, 0)

    // Get sparepart sales (services & spareparts via POS)
    const sparepartSales = await prisma.sparepartSale.findMany({
        where: {
            saleDate: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            items: {
                include: {
                    sparepart: {
                        select: {
                            name: true,
                            category: true,
                            purchasePrice: true,
                            currency: true,
                        },
                    },
                },
            },
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
        ],
    })

    // Calculate category breakdown
    const motorcycleStats = {
        count: motorcycleSales.length,
        totalRevenue: motorcycleSales.reduce((sum, s) => sum + s.sellingPriceIdr, 0),
        totalHPP: motorcycleSales.reduce((sum, s) => sum + s.totalCost, 0),
        totalProfit: motorcycleSales.reduce((sum, s) => sum + (s.profit || 0), 0),
    }

    // Group product sales by category
    const productCategories: Record<string, { count: number; revenue: number; hpp: number; profit: number }> = {}

    productSales.forEach(sale => {
        const category = sale.product.customCategory || sale.product.category
        if (!productCategories[category]) {
            productCategories[category] = { count: 0, revenue: 0, hpp: 0, profit: 0 }
        }
        productCategories[category].count++
        productCategories[category].revenue += sale.sellingPriceIdr
        productCategories[category].hpp += sale.totalCost
        productCategories[category].profit += sale.profit || 0
    })

    const productStats = {
        count: productSales.length,
        totalRevenue: productSales.reduce((sum, s) => sum + s.sellingPriceIdr, 0),
        totalHPP: productSales.reduce((sum, s) => sum + s.totalCost, 0),
        totalProfit: productSales.reduce((sum, s) => sum + (s.profit || 0), 0),
        categories: productCategories,
    }

    // Calculate sparepart/service stats
    const sparepartCategories: Record<string, { count: number; revenue: number; hpp: number; profit: number }> = {}

    sparepartSales.forEach(sale => {
        sale.items.forEach(item => {
            const category = item.sparepart.category
            if (!sparepartCategories[category]) {
                sparepartCategories[category] = { count: 0, revenue: 0, hpp: 0, profit: 0 }
            }
            sparepartCategories[category].count++
            sparepartCategories[category].revenue += item.subtotal
            // HPP is based on purchase price (for services, purchasePrice is typically 0)
            const hpp = item.sparepart.purchasePrice * item.quantity
            sparepartCategories[category].hpp += hpp
            sparepartCategories[category].profit += (item.subtotal - hpp)
        })
    })

    const sparepartStats = {
        count: sparepartSales.length,
        itemCount: sparepartSales.reduce((sum, s) => sum + s.items.length, 0),
        totalRevenue: sparepartSales.reduce((sum, s) => sum + s.total, 0),
        totalHPP: sparepartSales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => {
                return itemSum + (item.sparepart.purchasePrice * item.quantity)
            }, 0)
        }, 0),
        totalProfit: 0, // Will be calculated
        categories: sparepartCategories,
    }
    sparepartStats.totalProfit = sparepartStats.totalRevenue - sparepartStats.totalHPP

    // Summary (now includes sparepart sales)
    const totalRevenue = motorcycleStats.totalRevenue + productStats.totalRevenue + sparepartStats.totalRevenue
    const totalHPP = motorcycleStats.totalHPP + productStats.totalHPP + sparepartStats.totalHPP
    const grossProfit = totalRevenue - totalHPP
    const netProfit = grossProfit - totalExpenses
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Format sales data for table
    const salesDetails = [
        ...motorcycleSales.map(s => ({
            id: s.id,
            invoiceNumber: s.invoiceNumber || '-',
            type: 'Motor',
            name: `${s.motorcycle.brand} ${s.motorcycle.customModel || s.motorcycle.model} ${s.motorcycle.year}`,
            buyerName: s.buyerName,
            saleDate: s.saleDate,
            createdAt: s.createdAt,
            sellingPrice: s.sellingPriceIdr,
            hpp: s.totalCost,
            profit: s.profit,
            profitMargin: s.profitMargin,
            paymentMethod: s.paymentMethod,
            costBreakdown: s.motorcycle.costs.map(c => ({
                component: c.component,
                description: c.description,
                amount: c.amountIdr,
            })),
        })),
        ...productSales.map(s => ({
            id: s.id,
            invoiceNumber: s.invoiceNumber || '-',
            type: 'Product',
            name: s.product.name,
            category: s.product.customCategory || s.product.category,
            buyerName: s.buyerName,
            saleDate: s.saleDate,
            createdAt: s.createdAt,
            sellingPrice: s.sellingPriceIdr,
            hpp: s.totalCost,
            profit: s.profit,
            profitMargin: s.profitMargin,
            paymentMethod: s.paymentMethod,
            costBreakdown: s.product.costs.map(c => ({
                component: c.component,
                description: c.description,
                amount: c.amountIdr,
            })),
        })),
        // Add sparepart/service sales
        ...sparepartSales.map(s => {
            const totalHpp = s.items.reduce((sum, item) => sum + (item.sparepart.purchasePrice * item.quantity), 0)
            const profit = s.total - totalHpp
            const margin = s.total > 0 ? (profit / s.total) * 100 : 0
            return {
                id: s.id,
                invoiceNumber: s.invoiceNumber,
                type: 'Service/Sparepart',
                name: s.items.map(i => i.sparepart.name).join(', ').substring(0, 50) + (s.items.length > 1 ? '...' : ''),
                category: s.items[0]?.sparepart.category || 'SERVICE',
                buyerName: s.customerName || '-',
                saleDate: s.saleDate,
                createdAt: s.createdAt,
                sellingPrice: s.total,
                hpp: totalHpp,
                profit: profit,
                profitMargin: margin,
                paymentMethod: s.paymentMethod,
                costBreakdown: s.items.map(item => ({
                    component: item.sparepart.category,
                    description: `${item.sparepart.name} x${item.quantity}`,
                    amount: item.sparepart.purchasePrice * item.quantity,
                })),
            }
        }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Format expenses for display
    const expenseDetails = expenses.map((exp: any) => ({
        id: exp.id,
        category: exp.category,
        description: exp.description,
        amount: exp.amountIdr,
        transactionDate: exp.transactionDate,
        paymentMethod: exp.paymentMethod,
    }))

    return {
        period: {
            startDate,
            endDate,
        },
        summary: {
            totalRevenue,
            totalHPP,
            grossProfit,
            totalExpenses,
            netProfit,
            profitMargin,
            netProfitMargin,
            totalTransactions: motorcycleSales.length + productSales.length + sparepartSales.length,
            totalExpenseCount: expenses.length,
        },
        categoryBreakdown: {
            motorcycle: motorcycleStats,
            product: productStats,
            sparepart: sparepartStats,
        },
        expenses: {
            total: totalExpenses,
            count: expenses.length,
            categories: expenseCategories,
            details: expenseDetails,
        },
        salesDetails,
    }
})

