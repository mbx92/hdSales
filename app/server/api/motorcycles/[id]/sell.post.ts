import prisma from '../../../utils/prisma'
import { convertToIdr } from '../../../utils/currency'
import { generateInvoiceNumber } from '../../../utils/generateInvoice'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
        })
    }

    if (!body.sellingPrice || !body.currency || !body.buyerName || !body.paymentMethod) {
        throw createError({
            statusCode: 400,
            message: 'Harga jual, currency, nama pembeli, dan metode pembayaran harus diisi',
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
            message: 'Motor ini sudah terjual',
        })
    }

    if (motorcycle.status !== 'AVAILABLE') {
        throw createError({
            statusCode: 400,
            message: 'Motor harus dalam status AVAILABLE untuk dijual',
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
    const allCosts = await prisma.cost.findMany({
        where: { motorcycleId: id },
    })
    const totalCostIdr = allCosts.reduce((sum, c) => sum + c.amountIdr, 0)

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
            description: `Penjualan ${motorcycle.brand} ${motorcycle.model} ${motorcycle.year}`,
            category: 'MOTORCYCLE_SALE',
            transactionDate: saleDate,
        },
    })

    // Create sale transaction with invoice number
    const saleTransaction = await prisma.saleTransaction.create({
        data: {
            invoiceNumber,
            motorcycleId: id,
            sellingPrice: parseFloat(body.sellingPrice),
            currency: body.currency,
            exchangeRate,
            sellingPriceIdr,
            totalCost: motorcycle.currency === 'USD' ? totalCostIdr / exchangeRate : totalCostIdr,
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

    // Update motorcycle status
    await prisma.motorcycle.update({
        where: { id },
        data: {
            status: 'SOLD',
            sellingPrice: parseFloat(body.sellingPrice),
            profit,
        },
    })

    return saleTransaction
})
