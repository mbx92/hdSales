import bcrypt from 'bcryptjs'
import prisma from '../../utils/prisma'
import { signToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.email || !body.password) {
        throw createError({
            statusCode: 400,
            message: 'Email dan password harus diisi',
        })
    }

    const user = await prisma.user.findUnique({
        where: { email: body.email },
    })

    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Email atau password salah',
        })
    }

    const isValidPassword = await bcrypt.compare(body.password, user.password)
    if (!isValidPassword) {
        throw createError({
            statusCode: 401,
            message: 'Email atau password salah',
        })
    }

    const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
    })

    // Set cookie
    setCookie(event, 'auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    })

    return {
        success: true,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        token,
    }
})
