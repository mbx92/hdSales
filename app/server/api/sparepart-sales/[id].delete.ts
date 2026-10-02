import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { getUserFromEvent } from '../../utils/jwt'
import { lockSparepart, restoreSaleItemFifo } from '../../utils/sparepartFifo'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const currentUser = getUserFromEvent(event)
    const id = getRouterParam(event, 'id')

    if (currentUser?.role !== 'OWNER') {
        throw createError({
            statusCode: 403,
            message: 'Hanya OWNER yang dapat menghapus transaksi',
        })
    }

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID transaksi diperlukan' })
    }

    return await prisma.$transaction(async (tx) => {
        // 1. Get sale with items and sparepart info
        const sale = await tx.sparepartSale.findFirst({
            where: { id, userId },
            include: {
                items: {
                    include: {
                        sparepart: true
                    }
                }
            }
        })

        if (!sale) {
            throw createError({ statusCode: 404, message: 'Transaksi tidak ditemukan' })
        }

        // 2. Restore stock to the exact FIFO layers used by this sale.
        const physicalItems = sale.items
            .filter(item => item.sparepart.category !== 'SERVICE')
            .sort((a, b) => a.sparepartId.localeCompare(b.sparepartId))
        for (const item of physicalItems) {
            await lockSparepart(tx, item.sparepartId)
        }
        for (const item of physicalItems) {
            if (item.sparepart.category !== 'SERVICE') {
                await restoreSaleItemFifo(tx, item)
                await tx.sparepart.update({
                    where: { id: item.sparepartId },
                    data: { stock: { increment: item.quantity } }
                })
            }
        }

        // 3. Delete associated CashFlow (removes from reports)
        if (sale.cashFlowId) {
            await tx.cashFlow.delete({
                where: { id: sale.cashFlowId }
            })
        }

        // 4. Delete the sale record (items cascade automatically via onDelete: Cascade)
        await tx.sparepartSale.delete({
            where: { id }
        })

        return {
            success: true,
            message: 'Transaksi berhasil dihapus',
            deletedInvoice: sale.invoiceNumber,
            itemsRestored: sale.items.filter(i => i.sparepart.category !== 'SERVICE').length
        }
    })
})
