import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { getUserFromEvent } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    
    // Get current user to check role
    const currentUser = getUserFromEvent(event)
    if (!currentUser || currentUser.role !== 'OWNER') {
        throw createError({
            statusCode: 403,
            message: 'Hanya OWNER yang dapat melihat daftar user'
        })
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        },
        orderBy: { createdAt: 'asc' }
    })

    const totalUsers = users.length
    const canAddUser = totalUsers < 2

    return {
        users,
        totalUsers,
        canAddUser,
        maxUsers: 2
    }
})
