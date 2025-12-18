import prisma from '../../../../utils/prisma'
import { requireUser } from '../../../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const motorcycleId = getRouterParam(event, 'id')
    const costId = getRouterParam(event, 'costId')
    const body = await readBody(event)

    if (!motorcycleId || !costId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    // Verify motorcycle belongs to user
    const motorcycle = await prisma.motorcycle.findFirst({
        where: { id: motorcycleId, userId },
    })

    if (!motorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
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

    // Update associated cashflow record if exists
    if (existingCost.cashFlowId) {
        // Get motorcycle info for description
        const motorName = motorcycle ? `${motorcycle.brand} ${motorcycle.customModel || motorcycle.model}` : ''
        const newDescription = body.description || existingCost.description

        await prisma.cashFlow.update({
            where: { id: existingCost.cashFlowId },
            data: {
                amount: newAmount,
                currency: newCurrency,
                exchangeRate: newExchangeRate,
                amountIdr: newAmountIdr,
                description: motorName ? `${motorName}: ${newDescription}` : newDescription,
                category: body.component || existingCost.component,
                transactionDate: body.transactionDate ? new Date(body.transactionDate) : existingCost.transactionDate,
            },
        })
    }

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
    const updatedMotorcycle = await prisma.motorcycle.findUnique({
        where: { id: motorcycleId },
        include: { saleTransaction: true },
    })

    if (updatedMotorcycle?.status === 'SOLD' && updatedMotorcycle.saleTransaction) {
        const profitIdr = updatedMotorcycle.saleTransaction.sellingPriceIdr - totalCostIdr
        let profit = profitIdr
        if (updatedMotorcycle.saleTransaction.currency === 'USD') {
            profit = profitIdr / updatedMotorcycle.saleTransaction.exchangeRate
        }
        const profitMargin = (profitIdr / updatedMotorcycle.saleTransaction.sellingPriceIdr) * 100

        await prisma.saleTransaction.update({
            where: { id: updatedMotorcycle.saleTransaction.id },
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
