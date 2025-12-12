import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id
    const body = await readBody(event)

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
