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
        orderBy: { saleDate: 'desc' },
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
        orderBy: { saleDate: 'desc' },
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

    // Summary
    const totalRevenue = motorcycleStats.totalRevenue + productStats.totalRevenue
    const totalHPP = motorcycleStats.totalHPP + productStats.totalHPP
    const grossProfit = totalRevenue - totalHPP
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    // Format sales data for table
    const salesDetails = [
        ...motorcycleSales.map(s => ({
            id: s.id,
            invoiceNumber: s.invoiceNumber || '-',
            type: 'Motor',
            name: `${s.motorcycle.brand} ${s.motorcycle.customModel || s.motorcycle.model} ${s.motorcycle.year}`,
            buyerName: s.buyerName,
            saleDate: s.saleDate,
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
    ].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())

    return {
        period: {
            startDate,
            endDate,
        },
        summary: {
            totalRevenue,
            totalHPP,
            grossProfit,
            profitMargin,
            totalTransactions: motorcycleSales.length + productSales.length,
        },
        categoryBreakdown: {
            motorcycle: motorcycleStats,
            product: productStats,
        },
        salesDetails,
    }
})
