import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
        })
    }

    const motorcycle = await prisma.motorcycle.findUnique({
        where: { id },
    })

    if (!motorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
        })
    }

    if (motorcycle.status === 'SOLD') {
        throw createError({
            statusCode: 400,
            message: 'Motor yang sudah terjual tidak bisa dihapus',
        })
    }

    await prisma.motorcycle.delete({
        where: { id },
    })

    return {
        success: true,
        message: 'Motor berhasil dihapus',
    }
})
