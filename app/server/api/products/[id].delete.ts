import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID produk tidak valid',
        })
    }

    const product = await prisma.product.findFirst({
        where: { id, userId },
        include: {
            saleTransaction: true,
            costs: true
        },
    })

    if (!product) {
        throw createError({
            statusCode: 404,
            message: 'Produk tidak ditemukan',
        })
    }

    // Use transaction to handle cascade delete
    await prisma.$transaction(async (tx) => {
        // Delete related CashFlow from ProductSale if exists
        if (product.saleTransaction) {
            await tx.productSale.delete({
                where: { id: product.saleTransaction.id }
            })
            await tx.cashFlow.delete({
                where: { id: product.saleTransaction.cashFlowId }
            })
        }

        // Delete related CashFlow from ProductCosts
        for (const cost of product.costs) {
            await tx.productCost.delete({
                where: { id: cost.id }
            })
            await tx.cashFlow.delete({
                where: { id: cost.cashFlowId }
            })
        }

        // Delete product
        await tx.product.delete({
            where: { id },
        })
    })

    return { success: true, message: 'Produk berhasil dihapus' }
})
