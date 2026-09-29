import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { getUserFromEvent } from '../../utils/jwt'

type RequestedSaleItem = {
    id: string
    quantity: number
    unitPrice: number
}

type RequestedProductItem = {
    id: string
    unitPrice: number
}

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const currentUser = getUserFromEvent(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (currentUser?.role !== 'OWNER') {
        throw createError({
            statusCode: 403,
            message: 'Hanya OWNER yang dapat mengedit transaksi',
        })
    }

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID transaksi diperlukan' })
    }

    if (!Array.isArray(body.items) || !Array.isArray(body.productItems)) {
        throw createError({ statusCode: 400, message: 'Data item transaksi tidak valid' })
    }

    const requestedItems = body.items.map((item: RequestedSaleItem) => ({
        id: item.id,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
    }))
    const requestedProductItems = body.productItems.map((item: RequestedProductItem) => ({
        id: item.id,
        unitPrice: Number(item.unitPrice),
    }))
    const discount = Number(body.discount || 0)
    const saleDate = new Date(body.saleDate)
    const paymentMethod = String(body.paymentMethod || '')
    const customerName = String(body.customerName || '').trim()
    const customerPhone = String(body.customerPhone || '').trim()

    if (requestedItems.some((item: RequestedSaleItem) =>
        !item.id || !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.unitPrice) || item.unitPrice <= 0
    )) {
        throw createError({ statusCode: 400, message: 'Qty atau harga sparepart tidak valid' })
    }

    if (requestedProductItems.some((item: RequestedProductItem) =>
        !item.id || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0
    )) {
        throw createError({ statusCode: 400, message: 'Harga produk tidak valid' })
    }

    if (!Number.isFinite(discount) || discount < 0) {
        throw createError({ statusCode: 400, message: 'Diskon tidak valid' })
    }

    if (!customerName) {
        throw createError({ statusCode: 400, message: 'Nama customer wajib diisi' })
    }

    if (Number.isNaN(saleDate.getTime())) {
        throw createError({ statusCode: 400, message: 'Tanggal transaksi tidak valid' })
    }

    if (!['CASH', 'TRANSFER', 'CARD', 'QRIS'].includes(paymentMethod)) {
        throw createError({ statusCode: 400, message: 'Metode pembayaran tidak valid' })
    }

    return await prisma.$transaction(async (tx) => {
        const sale = await tx.sparepartSale.findFirst({
            where: { id, userId },
            include: {
                items: { include: { sparepart: true } },
            },
        })

        if (!sale) {
            throw createError({ statusCode: 404, message: 'Transaksi tidak ditemukan' })
        }

        const productSaleIds = sale.notes?.startsWith('PRODUCTS:')
            ? sale.notes.replace('PRODUCTS:', '').split(',').filter(Boolean)
            : []
        const productSales = productSaleIds.length
            ? await tx.productSale.findMany({
                where: {
                    id: { in: productSaleIds },
                    product: { userId },
                },
                include: { product: true },
            })
            : []

        const requestedItemIds = new Set(requestedItems.map((item: RequestedSaleItem) => item.id))
        const requestedProductIds = new Set(requestedProductItems.map((item: RequestedProductItem) => item.id))

        if (
            requestedItemIds.size !== sale.items.length ||
            sale.items.some(item => !requestedItemIds.has(item.id)) ||
            requestedProductIds.size !== productSales.length ||
            productSales.some(item => !requestedProductIds.has(item.id))
        ) {
            throw createError({
                statusCode: 400,
                message: 'Item transaksi tidak boleh ditambah, dihapus, atau diganti saat koreksi',
            })
        }

        let sparepartSubtotal = 0

        for (const existingItem of sale.items) {
            const requested = requestedItems.find((item: RequestedSaleItem) => item.id === existingItem.id)!
            const quantityDifference = requested.quantity - existingItem.quantity

            if (existingItem.sparepart.category !== 'SERVICE' && quantityDifference !== 0) {
                if (quantityDifference > 0 && existingItem.sparepart.stock < quantityDifference) {
                    throw createError({
                        statusCode: 400,
                        message: `Stok tidak cukup untuk ${existingItem.sparepart.name}. Tersedia ${existingItem.sparepart.stock}.`,
                    })
                }

                await tx.sparepart.update({
                    where: { id: existingItem.sparepartId },
                    data: {
                        stock: quantityDifference > 0
                            ? { decrement: quantityDifference }
                            : { increment: Math.abs(quantityDifference) },
                    },
                })
            }

            const subtotal = requested.quantity * requested.unitPrice
            sparepartSubtotal += subtotal

            await tx.sparepartSaleItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: requested.quantity,
                    unitPrice: requested.unitPrice,
                    subtotal,
                },
            })
        }

        const productSubtotal = requestedProductItems.reduce(
            (sum: number, item: RequestedProductItem) => sum + item.unitPrice,
            0,
        )
        const subtotal = sparepartSubtotal + productSubtotal
        if (discount > subtotal) {
            throw createError({ statusCode: 400, message: 'Diskon tidak boleh melebihi subtotal' })
        }

        const sparepartDiscount = productSubtotal > 0 && subtotal > 0
            ? Math.round(discount * (sparepartSubtotal / subtotal))
            : discount
        const productDiscount = discount - sparepartDiscount
        const sparepartTotal = Math.max(0, sparepartSubtotal - sparepartDiscount)
        const total = subtotal - discount
        let allocatedProductDiscount = 0

        for (const [index, existingProductSale] of productSales.entries()) {
            const requested = requestedProductItems.find((item: RequestedProductItem) => item.id === existingProductSale.id)!
            const profit = requested.unitPrice - existingProductSale.totalCost
            const profitMargin = requested.unitPrice > 0 ? (profit / requested.unitPrice) * 100 : 0
            const discountShare = index === productSales.length - 1
                ? productDiscount - allocatedProductDiscount
                : Math.round(productDiscount * (requested.unitPrice / productSubtotal))
            const paidAmount = Math.max(0, requested.unitPrice - discountShare)
            allocatedProductDiscount += discountShare

            await tx.productSale.update({
                where: { id: existingProductSale.id },
                data: {
                    sellingPrice: requested.unitPrice,
                    sellingPriceIdr: requested.unitPrice,
                    profit,
                    profitMargin,
                    buyerName: customerName,
                    buyerPhone: customerPhone || null,
                    paymentMethod,
                    paidAmount,
                    saleDate,
                },
            })

            await tx.product.update({
                where: { id: existingProductSale.productId },
                data: {
                    sellingPrice: requested.unitPrice,
                    profit,
                },
            })

            await tx.cashFlow.update({
                where: { id: existingProductSale.cashFlowId },
                data: {
                    amount: paidAmount,
                    amountIdr: paidAmount,
                    description: `Penjualan Produk: ${existingProductSale.product.name} (via POS #${sale.invoiceNumber})`,
                    transactionDate: saleDate,
                },
            })
        }

        if (sale.cashFlowId) {
            await tx.cashFlow.update({
                where: { id: sale.cashFlowId },
                data: {
                    amount: sparepartTotal,
                    amountIdr: sparepartTotal,
                    description: `Penjualan POS #${sale.invoiceNumber} - ${customerName}`,
                    transactionDate: saleDate,
                },
            })
        }

        return await tx.sparepartSale.update({
            where: { id: sale.id },
            data: {
                saleDate,
                customerName,
                customerPhone: customerPhone || null,
                paymentMethod,
                subtotal,
                discount,
                total,
                paidAmount: total,
            },
            include: {
                items: { include: { sparepart: true } },
            },
        })
    })
})
