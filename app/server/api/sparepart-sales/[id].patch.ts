import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { getUserFromEvent } from '../../utils/jwt'
import { lockSparepart, resizeSaleItemFifo } from '../../utils/sparepartFifo'

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

        const physicalSparepartIds = sale.items
            .filter(item => item.sparepart.category !== 'SERVICE')
            .map(item => item.sparepartId)
            .sort()
        for (const sparepartId of physicalSparepartIds) {
            await lockSparepart(tx, sparepartId)
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
        const itemCosts = new Map<string, number>()

        for (const existingItem of sale.items) {
            const requested = requestedItems.find((item: RequestedSaleItem) => item.id === existingItem.id)!
            const quantityDifference = requested.quantity - existingItem.quantity
            const savedUnitCost = existingItem.quantity > 0
                ? existingItem.costOfGoods / existingItem.quantity
                : existingItem.sparepart.purchasePrice
            let costOfGoods = savedUnitCost * requested.quantity

            if (existingItem.sparepart.category !== 'SERVICE' && quantityDifference !== 0) {
                const currentSparepart = await tx.sparepart.findUnique({
                    where: { id: existingItem.sparepartId },
                    select: { stock: true },
                })
                if (quantityDifference > 0 && (!currentSparepart || currentSparepart.stock < quantityDifference)) {
                    throw createError({
                        statusCode: 400,
                        message: `Stok tidak cukup untuk ${existingItem.sparepart.name}. Tersedia ${currentSparepart?.stock || 0}.`,
                    })
                }

                costOfGoods = await resizeSaleItemFifo(
                    tx,
                    existingItem.id,
                    existingItem.sparepartId,
                    existingItem.quantity,
                    requested.quantity,
                    savedUnitCost,
                )

                await tx.sparepart.update({
                    where: { id: existingItem.sparepartId },
                    data: {
                        stock: quantityDifference > 0
                            ? { decrement: quantityDifference }
                            : { increment: Math.abs(quantityDifference) },
                    },
                })
            }

            if (existingItem.sparepart.category !== 'SERVICE' && quantityDifference === 0) {
                costOfGoods = existingItem.costOfGoods
            }
            itemCosts.set(existingItem.id, costOfGoods)

            const subtotal = requested.quantity * requested.unitPrice
            sparepartSubtotal += subtotal

            await tx.sparepartSaleItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: requested.quantity,
                    unitPrice: requested.unitPrice,
                    subtotal,
                    costOfGoods,
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

        let allocatedSparepartDiscount = 0
        for (const [index, existingItem] of sale.items.entries()) {
            const requested = requestedItems.find((item: RequestedSaleItem) => item.id === existingItem.id)!
            const itemSubtotal = requested.quantity * requested.unitPrice
            const discountAmount = index === sale.items.length - 1
                ? sparepartDiscount - allocatedSparepartDiscount
                : Math.round(sparepartDiscount * (itemSubtotal / sparepartSubtotal))
            allocatedSparepartDiscount += discountAmount
            const netRevenue = itemSubtotal - discountAmount
            const costOfGoods = itemCosts.get(existingItem.id) || 0

            await tx.sparepartSaleItem.update({
                where: { id: existingItem.id },
                data: {
                    discountAmount,
                    netRevenue,
                    profit: netRevenue - costOfGoods,
                },
            })
        }

        for (const [index, existingProductSale] of productSales.entries()) {
            const requested = requestedProductItems.find((item: RequestedProductItem) => item.id === existingProductSale.id)!
            const discountShare = index === productSales.length - 1
                ? productDiscount - allocatedProductDiscount
                : Math.round(productDiscount * (requested.unitPrice / productSubtotal))
            const paidAmount = Math.max(0, requested.unitPrice - discountShare)
            const profit = paidAmount - existingProductSale.totalCost
            const profitMargin = paidAmount > 0 ? (profit / paidAmount) * 100 : 0
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
