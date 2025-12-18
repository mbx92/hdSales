import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id

    // Verify supplier belongs to user
    const existing = await prisma.supplier.findFirst({
        where: { id, userId }
    })

    if (!existing) {
        throw createError({
            statusCode: 404,
            message: 'Supplier tidak ditemukan'
        })
    }

    // Check if used in spareparts
    const count = await prisma.sparepart.count({
        where: { supplierId: id, userId }
    })

    if (count > 0) {
        throw createError({
            statusCode: 400,
            message: 'Supplier tidak bisa dihapus karena masih digunakan oleh spareparts'
        })
    }

    await prisma.supplier.delete({
        where: { id }
    })

    return { success: true }
})
