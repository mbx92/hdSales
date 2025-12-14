import prisma from '~/server/utils/prisma'
import { convertToIdr } from '~/server/utils/currency'
import { generateInvoiceNumber } from '~/server/utils/generateInvoice'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID produk tidak valid',
        })
    }

    if (!body.sellingPrice || !body.currency || !body.buyerName || !body.paymentMethod) {
        throw createError({
            statusCode: 400,
            message: 'Harga jual, currency, nama pembeli, dan metode pembayaran harus diisi',
        })
    }

    const product = await prisma.product.findUnique({
        where: { id },
    })

    if (!product) {
        throw createError({
            statusCode: 404,
            message: 'Produk tidak ditemukan',
        })
    }

    if (product.status === 'SOLD') {
        throw createError({
            statusCode: 400,
            message: 'Produk ini sudah terjual',
        })
    }

    if (product.status !== 'AVAILABLE') {
        throw createError({
            statusCode: 400,
            message: 'Produk harus dalam status AVAILABLE untuk dijual',
        })
    }

    // Generate invoice number
    const saleDate = body.saleDate ? new Date(body.saleDate) : new Date()
    const invoiceNumber = await generateInvoiceNumber('DHD', saleDate)

    // Convert selling price to IDR
    const { amountIdr: sellingPriceIdr, exchangeRate } = await convertToIdr(
        parseFloat(body.sellingPrice),
        body.currency
    )

    // Calculate total cost in IDR
    const allCosts = await prisma.productCost.findMany({
        where: { productId: id },
    })
    const totalCostIdr = allCosts.reduce((sum: number, c: any) => sum + c.amountIdr, 0)

    // Calculate profit
    const profitIdr = sellingPriceIdr - totalCostIdr
    let profit = profitIdr
    if (body.currency === 'USD') {
        profit = profitIdr / exchangeRate
    }

    const profitMargin = (profitIdr / sellingPriceIdr) * 100

    // Create cash flow
    const cashFlow = await prisma.cashFlow.create({
        data: {
            type: 'INCOME',
            amount: parseFloat(body.sellingPrice),
            currency: body.currency,
            exchangeRate,
            amountIdr: sellingPriceIdr,
            description: `Penjualan ${product.name}`,
            category: 'PRODUCT_SALE',
            transactionDate: saleDate,
        },
    })

    // Create sale transaction with invoice number
    const saleTransaction = await prisma.productSale.create({
        data: {
            invoiceNumber,
            productId: id,
            sellingPrice: parseFloat(body.sellingPrice),
            currency: body.currency,
            exchangeRate,
            sellingPriceIdr,
            totalCost: product.currency === 'USD' ? totalCostIdr / exchangeRate : totalCostIdr,
            profit,
            profitMargin,
            buyerName: body.buyerName,
            buyerPhone: body.buyerPhone,
            buyerAddress: body.buyerAddress,
            paymentMethod: body.paymentMethod,
            paidAmount: parseFloat(body.paidAmount || body.sellingPrice),
            remainingAmount: parseFloat(body.sellingPrice) - parseFloat(body.paidAmount || body.sellingPrice),
            saleDate,
            notes: body.notes,
            cashFlowId: cashFlow.id,
        },
    })

    // Update product status
    await prisma.product.update({
        where: { id },
        data: {
            status: 'SOLD',
            sellingPrice: parseFloat(body.sellingPrice),
            profit,
        },
    })

    return saleTransaction
})
