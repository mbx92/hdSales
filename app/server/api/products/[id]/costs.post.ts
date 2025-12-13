import prisma from '~/server/utils/prisma'
import { convertToIdr } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
    const productId = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!productId) {
        throw createError({
            statusCode: 400,
            message: 'ID produk tidak valid',
        })
    }

    if (!body.component || !body.description || !body.amount || !body.currency) {
        throw createError({
            statusCode: 400,
            message: 'Component, deskripsi, jumlah, dan currency harus diisi',
        })
    }

    const product = await prisma.product.findUnique({
        where: { id: productId },
    })

    if (!product) {
        throw createError({
            statusCode: 404,
            message: 'Produk tidak ditemukan',
        })
    }

    // Convert to IDR
    const { amountIdr, exchangeRate } = await convertToIdr(
        parseFloat(body.amount),
        body.currency
    )

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

    // Create product cost
    const cost = await prisma.productCost.create({
        data: {
            productId,
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

    // Recalculate total cost
    const allCosts = await prisma.productCost.findMany({
        where: { productId },
    })
    const totalCostIdr = allCosts.reduce((sum: number, c: any) => sum + c.amountIdr, 0)

    await prisma.product.update({
        where: { id: productId },
        data: { totalCost: totalCostIdr },
    })

    // If product is sold, recalculate profit
    const productWithSale = await prisma.product.findUnique({
        where: { id: productId },
        include: { saleTransaction: true },
    })

    if (productWithSale?.status === 'SOLD' && productWithSale.saleTransaction) {
        const profitIdr = productWithSale.saleTransaction.sellingPriceIdr - totalCostIdr
        let profit = profitIdr
        if (productWithSale.saleTransaction.currency === 'USD') {
            profit = profitIdr / productWithSale.saleTransaction.exchangeRate
        }
        const profitMargin = (profitIdr / productWithSale.saleTransaction.sellingPriceIdr) * 100

        await prisma.productSale.update({
            where: { id: productWithSale.saleTransaction.id },
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

    return cost
})
