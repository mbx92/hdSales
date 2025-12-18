import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID required' })
    }

    // Verify motorcycle belongs to user
    const motorcycle = await prisma.motorcycle.findFirst({
        where: { id, userId },
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
