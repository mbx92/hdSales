import prisma from '../utils/prisma'

export default defineEventHandler(async (event) => {
    setHeader(event, 'cache-control', 'no-store')

    try {
        await prisma.$queryRaw`SELECT 1`
        return { status: 'ok' }
    } catch {
        throw createError({
            statusCode: 503,
            message: 'Database unavailable',
        })
    }
})
