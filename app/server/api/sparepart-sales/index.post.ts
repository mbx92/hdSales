import prisma from '../../utils/prisma'
import { generateInvoiceNumber } from '../../utils/generateInvoice'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const items = body.items as Array<{ id: string; quantity: number; price: number }>

    if (!items || items.length === 0) {
        throw createError({ statusCode: 400, message: 'Keranjang belanja kosong' })
    }

    return await prisma.$transaction(async (tx) => {
        let subtotal = 0
        const productDetails: Array<{ id: string; isService: boolean }> = []

        // Check stock & calculate subtotal
        for (const item of items) {
            const product = await tx.sparepart.findUnique({ where: { id: item.id } })
            if (!product) throw createError({ statusCode: 400, message: `Produk ID ${item.id} tidak ditemukan` })

            const isService = product.category === 'SERVICE'
            productDetails.push({ id: item.id, isService })

            // Skip stock check for SERVICE category
            if (!isService && product.stock < item.quantity) {
                throw createError({ statusCode: 400, message: `Stok tidak cukup untuk produk: ${product.name}` })
            }

            subtotal += item.quantity * item.price
        }

        const discount = body.discount || 0
        const total = subtotal - discount
        const invoiceNumber = await generateInvoiceNumber('DHD', new Date())

        // Create CashFlow Entry (Income)
        const cashFlow = await tx.cashFlow.create({
            data: {
                type: 'INCOME',
                amount: total,
                currency: 'IDR', // Default IDR for now
                exchangeRate: 1,
                amountIdr: total,
                category: 'SPAREPART_SALE',
                description: `Penjualan Sparepart #${invoiceNumber} - ${body.customerName || 'Cash Customer'}`,
                transactionDate: new Date(),
            }
        })

        // Create Sale Transaction
        const sale = await tx.sparepartSale.create({
            data: {
                invoiceNumber,
                customerName: body.customerName,
                customerPhone: body.customerPhone,
                paymentMethod: body.paymentMethod || 'CASH',
                subtotal,
                discount,
                total,
                paidAmount: total, // Assumption: paid in full
                currency: 'IDR',
                cashFlowId: cashFlow.id,
                items: {
                    create: items.map(item => ({
                        sparepartId: item.id,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        subtotal: item.quantity * item.price
                    }))
                }
            }
        })

        // Update Stock (skip for SERVICE category)
        for (const item of items) {
            const detail = productDetails.find(p => p.id === item.id)
            if (detail && !detail.isService) {
                await tx.sparepart.update({
                    where: { id: item.id },
                    data: { stock: { decrement: item.quantity } }
                })
            }
        }

        return sale
    })
})
