import prisma from '../../../utils/prisma'
import { convertToIdr } from '../../../utils/currency'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
        })
    }

    if (!body.component || !body.description || !body.amount || !body.currency) {
        throw createError({
            statusCode: 400,
            message: 'Component, description, amount, dan currency harus diisi',
        })
    }

    const motorcycle = await prisma.motorcycle.findUnique({
        where: { id },
    })

    if (!motorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
        })
    }

    if (motorcycle.status === 'SOLD') {
        throw createError({
            statusCode: 400,
            message: 'Tidak bisa menambah biaya untuk motor yang sudah terjual',
        })
    }

    // Convert to IDR
    const { amountIdr, exchangeRate } = await convertToIdr(parseFloat(body.amount), body.currency)

    // Create cash flow
    const cashFlow = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: parseFloat(body.amount),
            currency: body.currency,
            exchangeRate,
            amountIdr,
            description: body.description,
            category: body.component,
            transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
        },
    })

    // Create cost
    const cost = await prisma.cost.create({
        data: {
            motorcycleId: id,
            component: body.component,
            description: body.description,
            amount: parseFloat(body.amount),
            currency: body.currency,
            exchangeRate,
            amountIdr,
            transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
            paymentMethod: body.paymentMethod,
            receipt: body.receipt,
            notes: body.notes,
            cashFlowId: cashFlow.id,
        },
    })

    // Update motorcycle total cost (HPP)
    const allCosts = await prisma.cost.findMany({
        where: { motorcycleId: id },
    })

    const totalCostIdr = allCosts.reduce((sum, c) => sum + c.amountIdr, 0)

    // Convert total to motorcycle's currency
    let totalCost = totalCostIdr
    if (motorcycle.currency === 'USD') {
        totalCost = totalCostIdr / exchangeRate
    }

    await prisma.motorcycle.update({
        where: { id },
        data: { totalCost },
    })

    return cost
})
