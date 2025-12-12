import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.fromCurrency || !body.toCurrency || !body.rate) {
        throw createError({
            statusCode: 400,
            message: 'fromCurrency, toCurrency, dan rate harus diisi',
        })
    }

    const rate = await prisma.exchangeRate.create({
        data: {
            fromCurrency: body.fromCurrency,
            toCurrency: body.toCurrency,
            rate: parseFloat(body.rate),
            effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
        },
    })

    return rate
})
