import prisma from '~/server/utils/prisma'

export default defineEventHandler(async () => {
    // Get motors that are not sold
    const motorcycles = await prisma.motorcycle.findMany({
        where: {
            status: { not: 'SOLD' },
        },
        include: {
            costs: true,
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
        ],
    })

    // Get products that are not sold
    const products = await prisma.product.findMany({
        where: {
            status: { not: 'SOLD' },
        },
        include: {
            costs: true,
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
        ],
    })

    // Get spareparts with stock > 0 (exclude SERVICE category)
    const spareparts = await prisma.sparepart.findMany({
        where: {
            stock: { gt: 0 },
            category: { not: 'SERVICE' },
            status: 'ACTIVE',
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
        ],
    })

    // Calculate totals for motorcycles
    const motorcycleAssets = motorcycles.map((m) => {
        const totalCost = m.costs.reduce((sum, c) => sum + c.amountIdr, 0)
        return {
            id: m.id,
            type: 'Motor',
            name: `${m.brand} ${m.customModel || m.model} ${m.year}`,
            vin: m.vin,
            status: m.status,
            color: m.color,
            mileage: m.mileage,
            costCount: m.costs.length,
            totalCost,
            createdAt: m.createdAt,
        }
    })

    // Calculate totals for products
    const productAssets = products.map((p) => {
        const totalCost = p.costs.reduce((sum, c) => sum + c.amountIdr, 0)
        return {
            id: p.id,
            type: 'Product',
            name: p.name,
            sku: p.sku,
            category: p.customCategory || p.category,
            status: p.status,
            costCount: p.costs.length,
            totalCost,
            createdAt: p.createdAt,
        }
    })

    // Calculate totals for spareparts
    const sparepartAssets = spareparts.map((s) => {
        return {
            id: s.id,
            type: 'Sparepart',
            name: s.name,
            sku: s.sku,
            category: s.category,
            brand: s.brand,
            stock: s.stock,
            minStock: s.minStock,
            purchasePrice: s.purchasePrice,
            totalValue: s.stock * s.purchasePrice,
            status: s.status,
            createdAt: s.createdAt,
        }
    })

    // Summary
    const motorcycleSummary = {
        count: motorcycleAssets.length,
        onProgress: motorcycleAssets.filter((m) => m.status === 'ON_PROGRESS').length,
        available: motorcycleAssets.filter((m) => m.status === 'AVAILABLE').length,
        totalValue: motorcycleAssets.reduce((sum, m) => sum + m.totalCost, 0),
    }

    const productSummary = {
        count: productAssets.length,
        onProgress: productAssets.filter((p) => p.status === 'ON_PROGRESS').length,
        available: productAssets.filter((p) => p.status === 'AVAILABLE').length,
        totalValue: productAssets.reduce((sum, p) => sum + p.totalCost, 0),
    }

    const sparepartSummary = {
        count: sparepartAssets.length,
        totalStock: sparepartAssets.reduce((sum, s) => sum + s.stock, 0),
        lowStock: sparepartAssets.filter((s) => s.stock <= s.minStock).length,
        totalValue: sparepartAssets.reduce((sum, s) => sum + s.totalValue, 0),
    }

    return {
        summary: {
            totalAssets: motorcycleSummary.count + productSummary.count + sparepartSummary.count,
            totalValue: motorcycleSummary.totalValue + productSummary.totalValue + sparepartSummary.totalValue,
            motorcycle: motorcycleSummary,
            product: productSummary,
            sparepart: sparepartSummary,
        },
        motorcycles: motorcycleAssets,
        products: productAssets,
        spareparts: sparepartAssets,
    }
})
