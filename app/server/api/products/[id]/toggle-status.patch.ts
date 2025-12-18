import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID required' })
    }

    const product = await prisma.product.findFirst({
        where: { id, userId },
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
