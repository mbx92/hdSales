import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

interface JWTPayload {
    userId: string
    email: string
    role: string
}

export function signToken(payload: JWTPayload): string {
    const config = useRuntimeConfig()
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn || '7d',
    })
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        const config = useRuntimeConfig()
        return jwt.verify(token, config.jwtSecret) as JWTPayload
    } catch {
        return null
    }
}

export function getTokenFromEvent(event: H3Event): string | null {
    // Check Authorization header
    const authHeader = getHeader(event, 'authorization')
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7)
    }

    // Check cookie
    const token = getCookie(event, 'auth_token')
    return token || null
}

export function getUserFromEvent(event: H3Event): JWTPayload | null {
    const token = getTokenFromEvent(event)
    if (!token) return null
    return verifyToken(token)
}

export function requireAuth(event: H3Event): JWTPayload {
    const user = getUserFromEvent(event)
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Unauthorized - Please login',
        })
    }
    return user
}
