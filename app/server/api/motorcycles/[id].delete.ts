import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
        })
    }

    const motorcycle = await prisma.motorcycle.findFirst({
        where: { id, userId },
        include: {
            saleTransaction: true,
            costs: true
        }
    })

    if (!motorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
        })
    }

    // Use transaction to handle cascade delete
    await prisma.$transaction(async (tx) => {
        // Delete related CashFlow from SaleTransaction if exists
        if (motorcycle.saleTransaction) {
            await tx.saleTransaction.delete({
                where: { id: motorcycle.saleTransaction.id }
            })
            await tx.cashFlow.delete({
                where: { id: motorcycle.saleTransaction.cashFlowId }
            })
        }

        // Delete related CashFlow from Costs
        for (const cost of motorcycle.costs) {
            await tx.cost.delete({
                where: { id: cost.id }
            })
            await tx.cashFlow.delete({
                where: { id: cost.cashFlowId }
            })
        }

        // Delete motorcycle
        await tx.motorcycle.delete({
            where: { id },
        })
    })

    return {
        success: true,
        message: 'Motor berhasil dihapus',
    }
})
