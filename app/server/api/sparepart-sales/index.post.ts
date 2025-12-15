import prisma from '../../utils/prisma'
import { generateInvoiceNumber } from '../../utils/generateInvoice'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const items = body.items as Array<{ id: string; quantity: number; price: number; itemType?: string }>

    if (!items || items.length === 0) {
        throw createError({ statusCode: 400, message: 'Keranjang belanja kosong' })
    }

    return await prisma.$transaction(async (tx) => {
        // Separate subtotals for spareparts and products
        let sparepartSubtotal = 0
        let productSubtotal = 0
        const sparepartItems: Array<{ id: string; quantity: number; price: number; isService: boolean; name: string }> = []
        const productItems: Array<{ id: string; price: number; name: string }> = []

        // Check stock & calculate subtotals
        for (const item of items) {
            if (item.itemType === 'product') {
                // Handle Product items
                const product = await tx.product.findUnique({ where: { id: item.id } })
                if (!product) throw createError({ statusCode: 400, message: `Produk ID ${item.id} tidak ditemukan` })
                if (product.status !== 'AVAILABLE') {
                    throw createError({ statusCode: 400, message: `Produk ${product.name} tidak tersedia` })
                }
                productItems.push({ id: item.id, price: item.price, name: product.name })
                productSubtotal += item.price
            } else {
                // Handle Sparepart items
                const sparepart = await tx.sparepart.findUnique({ where: { id: item.id } })
                if (!sparepart) throw createError({ statusCode: 400, message: `Sparepart ID ${item.id} tidak ditemukan` })

                const isService = sparepart.category === 'SERVICE'

                // Skip stock check for SERVICE category
                if (!isService && sparepart.stock < item.quantity) {
                    throw createError({ statusCode: 400, message: `Stok tidak cukup untuk: ${sparepart.name}` })
                }

                sparepartItems.push({ id: item.id, quantity: item.quantity, price: item.price, isService, name: sparepart.name })
                sparepartSubtotal += item.quantity * item.price
            }
        }

        const discount = body.discount || 0
        // Apply discount proportionally or to sparepart total
        const sparepartDiscount = productItems.length > 0
            ? Math.round(discount * (sparepartSubtotal / (sparepartSubtotal + productSubtotal)))
            : discount
        const productDiscount = discount - sparepartDiscount

        const sparepartTotal = Math.max(0, sparepartSubtotal - sparepartDiscount)
        const productTotalAfterDiscount = Math.max(0, productSubtotal - productDiscount)
        const grandTotal = sparepartTotal + productTotalAfterDiscount

        const invoiceNumber = await generateInvoiceNumber('DHD', new Date())
        const productSaleIds: string[] = []

        // Create CashFlow Entry for SPAREPART/SERVICE only (if any)
        let cashFlowId: string | null = null
        if (sparepartItems.length > 0) {
            const cashFlow = await tx.cashFlow.create({
                data: {
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
        for (const item of productItems) {
            const product = await tx.product.findUnique({ where: { id: item.id } })
            if (!product) continue

            // Create ProductSale cashflow
            const productCashFlow = await tx.cashFlow.create({
                data: {
                    type: 'INCOME',
                    amount: item.price,
                    currency: 'IDR',
                    exchangeRate: 1,
                    amountIdr: item.price,
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
                    profit: item.price - (product.totalCost || 0),
                    profitMargin: product.totalCost ? ((item.price - product.totalCost) / item.price) * 100 : 100,
                    buyerName: body.customerName || 'Cash Customer',
                    buyerPhone: body.customerPhone,
                    paymentMethod: body.paymentMethod || 'CASH',
                    paidAmount: item.price,
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
                    profit: item.price - (product.totalCost || 0)
                }
            })
        }

        // Create dummy cashflow if no spareparts but has products (for sale record linking)
        if (!cashFlowId && productItems.length > 0) {
            const dummyCashFlow = await tx.cashFlow.create({
                data: {
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
                invoiceNumber,
                customerName: body.customerName,
                customerPhone: body.customerPhone,
                paymentMethod: body.paymentMethod || 'CASH',
                subtotal: sparepartSubtotal + productSubtotal, // For display purposes
                discount,
                total: grandTotal,
                paidAmount: grandTotal,
                currency: 'IDR',
                cashFlowId: cashFlowId!,
                notes: productSaleIds.length > 0 ? `PRODUCTS:${productSaleIds.join(',')}` : null,
                items: {
                    create: sparepartItems.map(item => ({
                        sparepartId: item.id,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        subtotal: item.quantity * item.price
                    }))
                }
            }
        })

        // Update Sparepart Stock (skip for SERVICE category)
        for (const item of sparepartItems) {
            if (!item.isService) {
                await tx.sparepart.update({
                    where: { id: item.id },
                    data: { stock: { decrement: item.quantity } }
                })
            }
        }

        return {
            ...sale,
            productsSold: productItems.length,
            productSaleIds
        }
    })
})


