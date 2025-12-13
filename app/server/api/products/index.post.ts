import prisma from '~/server/utils/prisma'
import { convertToIdr } from '~/server/utils/currency'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.category || !body.name) {
        throw createError({
            statusCode: 400,
            message: 'Kategori dan nama produk harus diisi',
        })
    }

    // Create product
    const product = await prisma.product.create({
        data: {
            category: body.category,
            customCategory: body.customCategory,
            name: body.name,
            sku: body.sku,
            description: body.description,
            currency: body.currency || 'IDR',
            status: body.status || 'AVAILABLE',
            purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
            supplier: body.supplier,
            notes: body.notes,
        },
    })

    // If there's a purchase cost, add it
    if (body.purchasePrice) {
        const { amountIdr, exchangeRate } = await convertToIdr(
            parseFloat(body.purchasePrice),
            body.currency || 'IDR'
        )

        // Create cash flow for purchase
        const cashFlow = await prisma.cashFlow.create({
            data: {
                type: 'OUTCOME',
                amount: parseFloat(body.purchasePrice),
                currency: body.currency || 'IDR',
                exchangeRate,
                amountIdr,
                description: `Pembelian ${body.name}`,
                category: 'PRODUCT_PURCHASE',
                transactionDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
            },
        })

        // Create product cost
        await prisma.productCost.create({
            data: {
                productId: product.id,
                component: 'PURCHASE',
                description: 'Harga pembelian',
                amount: parseFloat(body.purchasePrice),
                currency: body.currency || 'IDR',
                exchangeRate,
                amountIdr,
                transactionDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
                paymentMethod: body.paymentMethod,
                cashFlowId: cashFlow.id,
            },
        })

        // Update product totalCost
        await prisma.product.update({
            where: { id: product.id },
            data: { totalCost: amountIdr },
        })
    }

    return product
})
