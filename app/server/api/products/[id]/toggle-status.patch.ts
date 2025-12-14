import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID required' })
    }

    const product = await prisma.product.findUnique({
        where: { id },
        select: { status: true }
    })

    if (!product) {
        throw createError({ statusCode: 404, message: 'Product tidak ditemukan' })
    }

    // Toggle between AVAILABLE and INACTIVE (not SOLD)
    const newStatus = product.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE'

    const updated = await prisma.product.update({
        where: { id },
        data: { status: newStatus }
    })

    return updated
})
