import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID transaksi diperlukan' })
    }

    return await prisma.$transaction(async (tx) => {
        // 1. Get sale with items and sparepart info
        const sale = await tx.sparepartSale.findUnique({
            where: { id },
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

        // 2. Restore stock for each item (skip SERVICE category)
        for (const item of sale.items) {
            if (item.sparepart.category !== 'SERVICE') {
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
