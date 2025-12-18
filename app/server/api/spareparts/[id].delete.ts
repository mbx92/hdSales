import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID sparepart tidak valid',
        })
    }

    const sparepart = await prisma.sparepart.findFirst({
        where: { id, userId },
        include: {
            saleItems: {
                include: {
                    sale: true
                }
            },
            stockAdjustments: true
        }
    })

    if (!sparepart) {
        throw createError({
            statusCode: 404,
            message: 'Sparepart tidak ditemukan',
        })
    }

    // Use transaction to handle cascade delete
    await prisma.$transaction(async (tx) => {
        // Delete related SparepartSaleItems
        if (sparepart.saleItems.length > 0) {
            await tx.sparepartSaleItem.deleteMany({
                where: { sparepartId: id }
            })
        }

        // Delete related StockAdjustments and their CashFlows
        for (const adjustment of sparepart.stockAdjustments) {
            if (adjustment.cashFlowId) {
                await tx.stockAdjustment.delete({
                    where: { id: adjustment.id }
                })
                await tx.cashFlow.delete({
                    where: { id: adjustment.cashFlowId }
                })
            } else {
                await tx.stockAdjustment.delete({
                    where: { id: adjustment.id }
                })
            }
        }

        // Delete sparepart
        await tx.sparepart.delete({
            where: { id }
        })
    })

    return { success: true, message: 'Sparepart berhasil dihapus' }
})
