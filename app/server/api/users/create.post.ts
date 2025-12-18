import prisma from '../../utils/prisma'
import bcrypt from 'bcryptjs'
import { requireUser } from '../../utils/requireUser'
import { getUserFromEvent } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const body = await readBody(event)

    // Get current user to check role
    const currentUser = getUserFromEvent(event)
    if (!currentUser || currentUser.role !== 'OWNER') {
        throw createError({
            statusCode: 403,
            message: 'Hanya OWNER yang dapat menambah user'
        })
    }

    // Check total users limit (max 2)
    const totalUsers = await prisma.user.count()
    if (totalUsers >= 2) {
        throw createError({
            statusCode: 400,
            message: 'Maksimal 2 user sudah tercapai'
        })
    }

    // Validate required fields
    if (!body.name || !body.email || !body.password) {
        throw createError({
            statusCode: 400,
            message: 'Nama, email, dan password wajib diisi'
        })
    }

    if (body.password.length < 6) {
        throw createError({
            statusCode: 400,
            message: 'Password minimal 6 karakter'
        })
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
        where: { email: body.email }
    })

    if (existing) {
        throw createError({
            statusCode: 400,
            message: 'Email sudah terdaftar'
        })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12)

    // Create user with ADMIN role (second user is always ADMIN)
    const user = await prisma.user.create({
        data: {
            name: body.name,
            email: body.email,
            password: hashedPassword,
            role: 'ADMIN'
        }
    })

    return {
        success: true,
        message: 'User berhasil ditambahkan',
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    }
})
