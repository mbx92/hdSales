import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.category || !body.description || !body.amount) {
        throw createError({
            statusCode: 400,
            message: 'Kategori, deskripsi, dan jumlah wajib diisi'
        })
    }

    const amount = parseFloat(body.amount)
    const currency = body.currency || 'IDR'
    const exchangeRate = body.exchangeRate || 1
    const amountIdr = amount * exchangeRate

    return await prisma.$transaction(async (tx) => {
        // Create CashFlow entry (OUTCOME)
        const cashFlow = await tx.cashFlow.create({
            data: {
                type: 'OUTCOME',
                amount,
                currency,
                exchangeRate,
                amountIdr,
                category: `EXPENSE_${body.category}`,
                description: body.description,
                transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
            }
        })

        // Create Expense record
        const expense = await tx.expense.create({
            data: {
                category: body.category,
                description: body.description,
                amount,
                currency,
                exchangeRate,
                amountIdr,
                transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
                paymentMethod: body.paymentMethod,
                receipt: body.receipt,
                notes: body.notes,
                cashFlowId: cashFlow.id
            }
        })

        return expense
    })
})
