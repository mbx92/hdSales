import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID required' })
    }

    const motorcycle = await prisma.motorcycle.findUnique({
        where: { id },
        select: { status: true }
    })

    if (!motorcycle) {
        throw createError({ statusCode: 404, message: 'Motorcycle tidak ditemukan' })
    }

    // Toggle between AVAILABLE and INACTIVE (not SOLD or ON_PROGRESS)
    const newStatus = motorcycle.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE'

    const updated = await prisma.motorcycle.update({
        where: { id },
        data: { status: newStatus }
    })

    return updated
})
