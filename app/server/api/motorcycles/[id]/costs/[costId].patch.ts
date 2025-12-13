import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
    const motorcycleId = getRouterParam(event, 'id')
    const costId = getRouterParam(event, 'costId')
    const body = await readBody(event)

    if (!motorcycleId || !costId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    // Verify cost belongs to this motorcycle
    const existingCost = await prisma.cost.findUnique({
        where: { id: costId },
        include: { motorcycle: true },
    })

    if (!existingCost || existingCost.motorcycleId !== motorcycleId) {
        throw createError({
            statusCode: 404,
            message: 'Biaya tidak ditemukan',
        })
    }

    // Calculate new amount and amountIdr
    const newAmount = body.amount !== undefined ? parseFloat(body.amount) : existingCost.amount
    const newCurrency = body.currency || existingCost.currency
    const newExchangeRate = body.exchangeRate !== undefined ? parseFloat(body.exchangeRate) : existingCost.exchangeRate

    // Calculate amountIdr based on currency
    let newAmountIdr = newAmount
    if (newCurrency === 'USD') {
        newAmountIdr = newAmount * newExchangeRate
    }

    // Update cost
    const updatedCost = await prisma.cost.update({
        where: { id: costId },
        data: {
            component: body.component || existingCost.component,
            description: body.description || existingCost.description,
            amount: newAmount,
            currency: newCurrency,
            exchangeRate: newExchangeRate,
            amountIdr: newAmountIdr,
            transactionDate: body.transactionDate ? new Date(body.transactionDate) : existingCost.transactionDate,
            paymentMethod: body.paymentMethod || existingCost.paymentMethod,
            receipt: body.receipt || existingCost.receipt,
            notes: body.notes !== undefined ? body.notes : existingCost.notes,
        },
    })

    // Recalculate motorcycle totalCost
    const allCosts = await prisma.cost.findMany({
        where: { motorcycleId },
    })
    const totalCostIdr = allCosts.reduce((sum, c) => sum + c.amountIdr, 0)

    await prisma.motorcycle.update({
        where: { id: motorcycleId },
        data: { totalCost: totalCostIdr },
    })

    // If motorcycle is sold, recalculate profit
    const motorcycle = await prisma.motorcycle.findUnique({
        where: { id: motorcycleId },
        include: { saleTransaction: true },
    })

    if (motorcycle?.status === 'SOLD' && motorcycle.saleTransaction) {
        const profitIdr = motorcycle.saleTransaction.sellingPriceIdr - totalCostIdr
        let profit = profitIdr
        if (motorcycle.saleTransaction.currency === 'USD') {
            profit = profitIdr / motorcycle.saleTransaction.exchangeRate
        }
        const profitMargin = (profitIdr / motorcycle.saleTransaction.sellingPriceIdr) * 100

        await prisma.saleTransaction.update({
            where: { id: motorcycle.saleTransaction.id },
            data: {
                totalCost: totalCostIdr,
                profit,
                profitMargin,
            },
        })

        await prisma.motorcycle.update({
            where: { id: motorcycleId },
            data: { profit },
        })
    }

    return updatedCost
})
