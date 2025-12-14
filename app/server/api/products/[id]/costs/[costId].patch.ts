import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const productId = getRouterParam(event, 'id')
    const costId = getRouterParam(event, 'costId')
    const body = await readBody(event)

    if (!productId || !costId) {
        throw createError({
            statusCode: 400,
            message: 'ID tidak valid',
        })
    }

    // Verify cost belongs to this product
    const existingCost = await prisma.productCost.findUnique({
        where: { id: costId },
        include: { product: true },
    })

    if (!existingCost || existingCost.productId !== productId) {
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
    const updatedCost = await prisma.productCost.update({
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
        // Get product info for description
        const product = await prisma.product.findUnique({
            where: { id: productId },
        })
        const productName = product?.name || ''
        const newDescription = body.description || existingCost.description

        await prisma.cashFlow.update({
            where: { id: existingCost.cashFlowId },
            data: {
                amount: newAmount,
                currency: newCurrency,
                exchangeRate: newExchangeRate,
                amountIdr: newAmountIdr,
                description: productName ? `${productName}: ${newDescription}` : newDescription,
                category: body.component || existingCost.component,
                transactionDate: body.transactionDate ? new Date(body.transactionDate) : existingCost.transactionDate,
            },
        })
    }

    // Recalculate product totalCost
    const allCosts = await prisma.productCost.findMany({
        where: { productId },
    })
    const totalCostIdr = allCosts.reduce((sum: number, c: any) => sum + c.amountIdr, 0)

    await prisma.product.update({
        where: { id: productId },
        data: { totalCost: totalCostIdr },
    })

    // If product is sold, recalculate profit
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { saleTransaction: true },
    })

    if (product?.status === 'SOLD' && product.saleTransaction) {
        const profitIdr = product.saleTransaction.sellingPriceIdr - totalCostIdr
        let profit = profitIdr
        if (product.saleTransaction.currency === 'USD') {
            profit = profitIdr / product.saleTransaction.exchangeRate
        }
        const profitMargin = (profitIdr / product.saleTransaction.sellingPriceIdr) * 100

        await prisma.productSale.update({
            where: { id: product.saleTransaction.id },
            data: {
                totalCost: totalCostIdr,
                profit,
                profitMargin,
            },
        })

        await prisma.product.update({
            where: { id: productId },
            data: { profit },
        })
    }

    return updatedCost
})
