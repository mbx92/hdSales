import prisma from '../../utils/prisma'

export default defineEventHandler(async () => {
    const rate = await prisma.exchangeRate.findFirst({
        where: {
            fromCurrency: 'USD',
            toCurrency: 'IDR',
        },
        orderBy: { effectiveDate: 'desc' },
    })

    return rate || { fromCurrency: 'USD', toCurrency: 'IDR', rate: 15500 }
})
