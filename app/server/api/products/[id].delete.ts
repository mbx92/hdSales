import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID produk tidak valid',
        })
    }

    const product = await prisma.product.findUnique({
        where: { id },
        include: { saleTransaction: true },
    })

    if (!product) {
        throw createError({
            statusCode: 404,
            message: 'Produk tidak ditemukan',
        })
    }

    if (product.status === 'SOLD') {
        throw createError({
            statusCode: 400,
            message: 'Produk yang sudah terjual tidak dapat dihapus',
        })
    }

    // Delete product (will cascade delete costs)
    await prisma.product.delete({
        where: { id },
    })

    return { success: true, message: 'Produk berhasil dihapus' }
})
