import prisma from '~/server/utils/prisma'

export default defineEventHandler(async () => {
    // Count motorcycles by status
    const statusCounts = await prisma.motorcycle.groupBy({
        by: ['status'],
        _count: {
            status: true,
        },
    })

    // Transform to simple object
    const stats: Record<string, number> = {
        ON_PROGRESS: 0,
        AVAILABLE: 0,
        SOLD: 0,
    }

    statusCounts.forEach(item => {
        stats[item.status] = item._count.status
    })

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0)

    return {
        stats,
        total,
        // For donut chart
        chartData: [
            { label: 'On Progress', value: stats.ON_PROGRESS, color: '#FBBD23' },  // warning
            { label: 'Tersedia', value: stats.AVAILABLE, color: '#36D399' },       // success
            { label: 'Terjual', value: stats.SOLD, color: '#3ABFF8' },             // info
        ],
    }
})
