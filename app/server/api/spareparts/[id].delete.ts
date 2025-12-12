import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    // Check sales history
    const count = await prisma.sparepartSaleItem.count({
        where: { sparepartId: id }
    })

    if (count > 0) {
        throw createError({
            statusCode: 400,
            message: 'Sparepart tidak bisa dihapus karena memiliki riwayat penjualan. Silakan non-aktifkan statusnya.'
        })
    }

    await prisma.sparepart.delete({
        where: { id }
    })

    return { success: true }
})
