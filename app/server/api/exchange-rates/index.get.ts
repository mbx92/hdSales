import prisma from '../../utils/prisma'

export default defineEventHandler(async () => {
    const rates = await prisma.exchangeRate.findMany({
        orderBy: { effectiveDate: 'desc' },
        take: 30,
    })

    return rates
})
