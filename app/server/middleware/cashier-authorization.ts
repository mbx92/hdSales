import { getUserFromEvent } from '../utils/jwt'

const isMatch = (path: string, pattern: RegExp) => pattern.test(path)

export default defineEventHandler((event) => {
    const path = getRequestURL(event).pathname

    if (!path.startsWith('/api/')) return

    const user = getUserFromEvent(event)
    if (!user || user.role !== 'CASHIER') return

    const method = event.method.toUpperCase()
    const allowed =
        path.startsWith('/api/auth/') ||
        (path === '/api/spareparts' && ['GET', 'POST'].includes(method)) ||
        (isMatch(path, /^\/api\/spareparts\/[^/]+$/) && ['GET', 'PATCH'].includes(method)) ||
        (isMatch(path, /^\/api\/spareparts\/[^/]+\/toggle-status$/) && method === 'PATCH') ||
        (isMatch(path, /^\/api\/spareparts\/[^/]+\/stock-adjustments?$/) && ['GET', 'POST'].includes(method)) ||
        (path === '/api/suppliers' && ['GET', 'POST'].includes(method)) ||
        (isMatch(path, /^\/api\/suppliers\/[^/]+$/) && ['PATCH', 'DELETE'].includes(method)) ||
        (path === '/api/products' && method === 'GET') ||
        (isMatch(path, /^\/api\/products\/[^/]+$/) && method === 'PATCH') ||
        (path === '/api/sparepart-sales' && method === 'POST') ||
        (isMatch(path, /^\/api\/sparepart-sales\/[^/]+$/) && method === 'GET')

    if (!allowed) {
        throw createError({
            statusCode: 403,
            message: 'Akses tidak diizinkan untuk role CASHIER',
        })
    }
})
