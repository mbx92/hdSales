import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    // Check if used in spareparts
    const count = await prisma.sparepart.count({
        where: { supplierId: id }
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
