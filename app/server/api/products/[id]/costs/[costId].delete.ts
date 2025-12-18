import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const productId = getRouterParam(event, 'id')
    const costId = getRouterParam(event, 'costId')

    if (!productId || !costId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    // Verify product belongs to user
    const product = await prisma.product.findFirst({
        where: { id: productId, userId },
    })

    if (!product) {
        throw createError({
            statusCode: 404,
            message: 'Produk tidak ditemukan',
        })
    }

    // Verify cost belongs to this product
    const existingCost = await prisma.productCost.findUnique({
        where: { id: costId },
    })

    if (!existingCost || existingCost.productId !== productId) {
        throw createError({
            statusCode: 404,
            message: 'Biaya tidak ditemukan',
        })
    }

    // Delete cost
    await prisma.productCost.delete({
        where: { id: costId },
    })

    // Delete associated cashflow if exists
    if (existingCost.cashFlowId) {
        await prisma.cashFlow.delete({
            where: { id: existingCost.cashFlowId },
        })
    }

    // Recalculate product totalCost
    const allCosts = await prisma.productCost.findMany({
        where: { productId },
    })
    const totalCostIdr = allCosts.reduce((sum: number, c: any) => sum + c.amountIdr, 0)

    await prisma.product.update({
        where: { id: productId },
        data: { totalCost: totalCostIdr },
    })

    // If product is sold, recalculate profit
    const updatedProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: { saleTransaction: true },
    })

    if (updatedProduct?.status === 'SOLD' && updatedProduct.saleTransaction) {
        const profitIdr = updatedProduct.saleTransaction.sellingPriceIdr - totalCostIdr
        let profit = profitIdr
        if (updatedProduct.saleTransaction.currency === 'USD') {
            profit = profitIdr / updatedProduct.saleTransaction.exchangeRate
        }
        const profitMargin = (profitIdr / updatedProduct.saleTransaction.sellingPriceIdr) * 100

        await prisma.productSale.update({
            where: { id: updatedProduct.saleTransaction.id },
            data: {
                totalCost: totalCostIdr,
                profit,
                profitMargin,
            },
        })

        await prisma.product.update({
            where: { id: productId },
            data: { profit },
        })
    }

    return { success: true, message: 'Biaya berhasil dihapus' }
})
