import bcrypt from 'bcryptjs'
import prisma from '../../utils/prisma'
import { verifyToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    // Get auth token from cookie
    const token = getCookie(event, 'auth_token')
    if (!token) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized',
        })
    }

    // Verify token and get user ID
    let decoded: any
    try {
        decoded = verifyToken(token)
    } catch (e) {
        throw createError({
            statusCode: 401,
            message: 'Token tidak valid',
        })
    }

    const body = await readBody(event)

    // Validate input
    if (!body.currentPassword || !body.newPassword) {
        throw createError({
            statusCode: 400,
            message: 'Password lama dan password baru harus diisi',
        })
    }

    if (body.newPassword.length < 6) {
        throw createError({
            statusCode: 400,
            message: 'Password baru minimal 6 karakter',
        })
    }

    if (body.newPassword !== body.confirmPassword) {
        throw createError({
            statusCode: 400,
            message: 'Konfirmasi password tidak cocok',
        })
    }

    // Get current user
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
    })

    if (!user) {
        throw createError({
            statusCode: 404,
            message: 'User tidak ditemukan',
        })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(body.currentPassword, user.password)
    if (!isValidPassword) {
        throw createError({
            statusCode: 401,
            message: 'Password lama tidak benar',
        })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(body.newPassword, 10)

    // Update password
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
    })

    return {
        success: true,
        message: 'Password berhasil diubah',
    }
})
