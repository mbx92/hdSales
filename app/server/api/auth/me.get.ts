import prisma from '../../utils/prisma'
import { getUserFromEvent } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    const payload = getUserFromEvent(event)

    if (!payload) {
        throw createError({
            statusCode: 401,
            message: 'Tidak terautentikasi',
        })
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
        },
    })

    if (!user) {
        throw createError({
            statusCode: 404,
            message: 'User tidak ditemukan',
        })
    }

    return user
})
