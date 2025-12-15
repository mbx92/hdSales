import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Sale ID is required'
        })
    }

    const sale = await prisma.sparepartSale.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    sparepart: {
                        select: {
                            name: true,
                            sku: true,
                            brand: true,
                            category: true
                        }
                    }
                }
            }
        }
    })

    if (!sale) {
        throw createError({
            statusCode: 404,
            message: 'Penjualan tidak ditemukan'
        })
    }

    // Parse linked product sales from notes field
    let productItems: any[] = []
    if (sale.notes && sale.notes.startsWith('PRODUCTS:')) {
        const productSaleIds = sale.notes.replace('PRODUCTS:', '').split(',').filter(Boolean)
        if (productSaleIds.length > 0) {
            const productSales = await prisma.productSale.findMany({
                where: { id: { in: productSaleIds } },
                include: {
                    product: {
                        select: {
                            name: true,
                            sku: true,
                            category: true
                        }
                    }
                }
            })
            productItems = productSales.map(ps => ({
                id: ps.id,
                productId: ps.productId,
                name: ps.product.name,
                sku: ps.product.sku || `PRD-${ps.productId.slice(-4).toUpperCase()}`,
                category: ps.product.category,
                quantity: 1,
                unitPrice: ps.sellingPrice,
                subtotal: ps.sellingPrice,
                itemType: 'product'
            }))
        }
    }

    return {
        ...sale,
        productItems
    }
})

