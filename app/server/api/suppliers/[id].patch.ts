import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id
    const body = await readBody(event)

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

    const supplier = await prisma.supplier.update({
        where: { id },
        data: {
            name: body.name,
            phone: body.phone,
            email: body.email,
            address: body.address,
            notes: body.notes,
        }
    })

    return supplier
})
