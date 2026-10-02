import prisma from '../../utils/prisma'
import { generateInvoiceNumber } from '../../utils/generateInvoice'
import { requireUser } from '../../utils/requireUser'
import { consumeFifo, lockSparepart, saveFifoAllocations } from '../../utils/sparepartFifo'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const body = await readBody(event)
    const rawItems = body.items as Array<{ id: string; quantity: number; price: number; itemType?: string }>

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw createError({ statusCode: 400, message: 'Keranjang belanja kosong' })
    }

    const items = rawItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
    }))

    const itemKeys = new Set<string>()
    for (const item of items) {
        if (!item.id || !Number.isInteger(item.quantity) || item.quantity < 1) {
            throw createError({ statusCode: 400, message: 'Qty item harus berupa bilangan bulat minimal 1' })
        }
        if (!Number.isFinite(item.price) || item.price <= 0) {
            throw createError({ statusCode: 400, message: 'Harga item tidak valid' })
        }
        if (item.itemType === 'product' && item.quantity !== 1) {
            throw createError({ statusCode: 400, message: 'Produk hanya dapat dijual sebanyak 1 unit' })
        }

        const itemKey = `${item.itemType || 'sparepart'}:${item.id}`
        if (itemKeys.has(itemKey)) {
            throw createError({ statusCode: 400, message: 'Item yang sama tidak boleh dikirim lebih dari sekali' })
        }
        itemKeys.add(itemKey)
    }

    return await prisma.$transaction(async (tx) => {
        const physicalSparepartIds = items
            .filter(item => item.itemType !== 'product')
            .map(item => item.id)
            .sort()
        for (const sparepartId of physicalSparepartIds) {
            await lockSparepart(tx, sparepartId)
        }

        // Separate subtotals for spareparts and products
        let sparepartSubtotal = 0
        let productSubtotal = 0
        const sparepartItems: Array<{
            id: string
            quantity: number
            price: number
            isService: boolean
            name: string
            purchasePrice: number
        }> = []
        const productItems: Array<{ id: string; price: number; name: string }> = []

        // Check stock & calculate subtotals - validate ownership
        for (const item of items) {
            if (item.itemType === 'product') {
                // Handle Product items - verify belongs to user
                const product = await tx.product.findFirst({ where: { id: item.id, userId } })
                if (!product) throw createError({ statusCode: 400, message: `Produk ID ${item.id} tidak ditemukan` })
                if (product.status !== 'AVAILABLE') {
                    throw createError({ statusCode: 400, message: `Produk ${product.name} tidak tersedia` })
                }
                productItems.push({ id: item.id, price: item.price, name: product.name })
                productSubtotal += item.price
            } else {
                // Handle Sparepart items - verify belongs to user
                const sparepart = await tx.sparepart.findFirst({ where: { id: item.id, userId } })
                if (!sparepart) throw createError({ statusCode: 400, message: `Sparepart ID ${item.id} tidak ditemukan` })

                const isService = sparepart.category === 'SERVICE'

                // Skip stock check for SERVICE category
                if (!isService && sparepart.stock < item.quantity) {
                    throw createError({ statusCode: 400, message: `Stok tidak cukup untuk: ${sparepart.name}` })
                }

                sparepartItems.push({
                    id: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    isService,
                    name: sparepart.name,
                    purchasePrice: sparepart.purchasePrice,
                })
                sparepartSubtotal += item.quantity * item.price
            }
        }

        const subtotal = sparepartSubtotal + productSubtotal
        const discount = Number(body.discount || 0)

        if (!Number.isFinite(discount) || discount < 0) {
            throw createError({ statusCode: 400, message: 'Diskon tidak valid' })
        }
        if (discount > subtotal) {
            throw createError({ statusCode: 400, message: 'Diskon tidak boleh melebihi subtotal' })
        }

        // Apply discount proportionally or to sparepart total
        const sparepartDiscount = productItems.length > 0
            ? Math.round(discount * (sparepartSubtotal / subtotal))
            : discount
        const productDiscount = discount - sparepartDiscount

        const sparepartTotal = Math.max(0, sparepartSubtotal - sparepartDiscount)
        const productTotalAfterDiscount = Math.max(0, productSubtotal - productDiscount)
        const grandTotal = sparepartTotal + productTotalAfterDiscount

        const invoiceNumber = await generateInvoiceNumber('SPR', new Date(), userId)
        const productSaleIds: string[] = []

        // Create CashFlow Entry for SPAREPART/SERVICE only (if any)
        let cashFlowId: string | null = null
        if (sparepartItems.length > 0) {
            const cashFlow = await tx.cashFlow.create({
                data: {
                    userId,
                    type: 'INCOME',
                    amount: sparepartTotal,
                    currency: 'IDR',
                    exchangeRate: 1,
                    amountIdr: sparepartTotal,
                    category: 'SPAREPART_SALE',
                    description: `Penjualan POS #${invoiceNumber} - ${body.customerName || 'Cash Customer'}`,
                    transactionDate: new Date(),
                }
            })
            cashFlowId = cashFlow.id
        }

        // Handle Product sales FIRST - create separate CashFlow for each product
        let allocatedProductDiscount = 0
        for (const [index, item] of productItems.entries()) {
            const product = await tx.product.findUnique({ where: { id: item.id } })
            if (!product) continue

            const discountShare = index === productItems.length - 1
                ? productDiscount - allocatedProductDiscount
                : Math.round(productDiscount * (item.price / productSubtotal))
            allocatedProductDiscount += discountShare
            const netPrice = Math.max(0, item.price - discountShare)
            const profit = netPrice - (product.totalCost || 0)
            const profitMargin = netPrice > 0 ? (profit / netPrice) * 100 : 0

            // Create ProductSale cashflow
            const productCashFlow = await tx.cashFlow.create({
                data: {
                    userId,
                    type: 'INCOME',
                    amount: netPrice,
                    currency: 'IDR',
                    exchangeRate: 1,
                    amountIdr: netPrice,
                    category: 'PRODUCT_SALE',
                    description: `Penjualan Produk: ${product.name} (via POS #${invoiceNumber})`,
                    transactionDate: new Date(),
                }
            })

            // Create ProductSale record
            const productSale = await tx.productSale.create({
                data: {
                    invoiceNumber: `${invoiceNumber}-P${productSaleIds.length + 1}`,
                    productId: item.id,
                    sellingPrice: item.price,
                    currency: 'IDR',
                    exchangeRate: 1,
                    sellingPriceIdr: item.price,
                    totalCost: product.totalCost || 0,
                    profit,
                    profitMargin,
                    buyerName: body.customerName || 'Cash Customer',
                    buyerPhone: body.customerPhone,
                    paymentMethod: body.paymentMethod || 'CASH',
                    paidAmount: netPrice,
                    cashFlowId: productCashFlow.id
                }
            })
            productSaleIds.push(productSale.id)

            // Update Product status to SOLD
            await tx.product.update({
                where: { id: item.id },
                data: {
                    status: 'SOLD',
                    sellingPrice: item.price,
                    profit,
                }
            })
        }

        // Create dummy cashflow if no spareparts but has products (for sale record linking)
        if (!cashFlowId && productItems.length > 0) {
            const dummyCashFlow = await tx.cashFlow.create({
                data: {
                    userId,
                    type: 'INCOME',
                    amount: 0,
                    currency: 'IDR',
                    exchangeRate: 1,
                    amountIdr: 0,
                    category: 'SPAREPART_SALE',
                    description: `POS Invoice #${invoiceNumber} (produk only)`,
                    transactionDate: new Date(),
                }
            })
            cashFlowId = dummyCashFlow.id
        }

        // Create Sale Transaction record
        const sale = await tx.sparepartSale.create({
            data: {
                userId,
                invoiceNumber,
                customerName: body.customerName,
                customerPhone: body.customerPhone,
                paymentMethod: body.paymentMethod || 'CASH',
                subtotal, // For display purposes
                discount,
                total: grandTotal,
                paidAmount: grandTotal,
                currency: 'IDR',
                cashFlowId: cashFlowId!,
                notes: productSaleIds.length > 0 ? `PRODUCTS:${productSaleIds.join(',')}` : null,
            }
        })

        // Persist the financial snapshot and consume physical stock using FIFO.
        let allocatedSparepartDiscount = 0
        for (const [index, item] of sparepartItems.entries()) {
            const itemSubtotal = item.quantity * item.price
            const discountAmount = index === sparepartItems.length - 1
                ? sparepartDiscount - allocatedSparepartDiscount
                : Math.round(sparepartDiscount * (itemSubtotal / sparepartSubtotal))
            allocatedSparepartDiscount += discountAmount
            const netRevenue = itemSubtotal - discountAmount

            const saleItem = await tx.sparepartSaleItem.create({
                data: {
                    saleId: sale.id,
                    sparepartId: item.id,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    subtotal: itemSubtotal,
                    discountAmount,
                    netRevenue,
                    costOfGoods: 0,
                    profit: netRevenue,
                },
            })

            let costOfGoods = item.purchasePrice * item.quantity
            if (!item.isService) {
                const fifo = await consumeFifo(tx, item.id, item.quantity)
                costOfGoods = fifo.costOfGoods
                await saveFifoAllocations(tx, saleItem.id, fifo.allocations)

                await tx.sparepart.update({
                    where: { id: item.id },
                    data: { stock: { decrement: item.quantity } }
                })
            }

            await tx.sparepartSaleItem.update({
                where: { id: saleItem.id },
                data: {
                    costOfGoods,
                    profit: netRevenue - costOfGoods,
                },
            })
        }

        return {
            ...sale,
            productsSold: productItems.length,
            productSaleIds
        }
    })
})
