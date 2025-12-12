import prisma from '../../utils/prisma'
import { convertToIdr } from '../../utils/currency'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID biaya tidak valid',
        })
    }

    const existingCost = await prisma.cost.findUnique({
        where: { id },
        include: { motorcycle: true },
    })

    if (!existingCost) {
        throw createError({
            statusCode: 404,
            message: 'Biaya tidak ditemukan',
        })
    }

    if (existingCost.motorcycle?.status === 'SOLD') {
        throw createError({
            statusCode: 400,
            message: 'Tidak bisa mengubah biaya untuk motor yang sudah terjual',
        })
    }

    // Recalculate if amount or currency changed
    let amountIdr = existingCost.amountIdr
    let exchangeRate = existingCost.exchangeRate

    if (body.amount || body.currency) {
        const result = await convertToIdr(
            parseFloat(body.amount ?? existingCost.amount),
            body.currency ?? existingCost.currency
        )
        amountIdr = result.amountIdr
        exchangeRate = result.exchangeRate
    }

    const cost = await prisma.cost.update({
        where: { id },
        data: {
            component: body.component ?? existingCost.component,
            description: body.description ?? existingCost.description,
            amount: body.amount ? parseFloat(body.amount) : existingCost.amount,
            currency: body.currency ?? existingCost.currency,
            exchangeRate,
            amountIdr,
            transactionDate: body.transactionDate ? new Date(body.transactionDate) : existingCost.transactionDate,
            paymentMethod: body.paymentMethod ?? existingCost.paymentMethod,
            receipt: body.receipt ?? existingCost.receipt,
            notes: body.notes ?? existingCost.notes,
        },
    })

    // Recalculate motorcycle HPP if linked
    if (existingCost.motorcycleId) {
        const allCosts = await prisma.cost.findMany({
            where: { motorcycleId: existingCost.motorcycleId },
        })

        const totalCostIdr = allCosts.reduce((sum, c) => sum + c.amountIdr, 0)
        const motorcycle = existingCost.motorcycle!

        let totalCost = totalCostIdr
        if (motorcycle.currency === 'USD') {
            totalCost = totalCostIdr / exchangeRate
        }

        await prisma.motorcycle.update({
            where: { id: existingCost.motorcycleId },
            data: { totalCost },
        })
    }

    return cost
})
