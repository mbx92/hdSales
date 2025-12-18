import type { H3Event } from 'h3'
import { requireAuth } from './jwt'

/**
 * Get the authenticated user's ID from the request.
 * Throws 401 if not authenticated.
 */
export function requireUser(event: H3Event): string {
    const auth = requireAuth(event)
    return auth.userId
}

/**
 * Get user info from event, or null if not authenticated.
 * Use this for optional auth scenarios.
 */
export function getUserId(event: H3Event): string | null {
    try {
        const auth = requireAuth(event)
        return auth.userId
    } catch {
        return null
    }
}
