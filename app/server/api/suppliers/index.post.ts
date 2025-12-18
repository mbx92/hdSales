import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const body = await readBody(event)

    if (!body.name) {
        throw createError({
            statusCode: 400,
            message: 'Nama supplier wajib diisi'
        })
    }

    const supplier = await prisma.supplier.create({
        data: {
            userId,
            name: body.name,
            phone: body.phone,
            email: body.email,
            address: body.address,
            notes: body.notes,
        }
    })

    return supplier
})
