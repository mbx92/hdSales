import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Expense ID is required'
        })
    }

    const existingExpense = await prisma.expense.findUnique({
        where: { id }
    })

    if (!existingExpense) {
        throw createError({
            statusCode: 404,
            message: 'Expense tidak ditemukan'
        })
    }

    const amount = body.amount !== undefined ? parseFloat(body.amount) : existingExpense.amount
    const currency = body.currency || existingExpense.currency
    const exchangeRate = body.exchangeRate || existingExpense.exchangeRate
    const amountIdr = amount * exchangeRate

    return await prisma.$transaction(async (tx) => {
        // Update CashFlow entry
        await tx.cashFlow.update({
            where: { id: existingExpense.cashFlowId },
            data: {
                amount,
                currency,
                exchangeRate,
                amountIdr,
                category: `EXPENSE_${body.category || existingExpense.category}`,
                description: body.description || existingExpense.description,
                transactionDate: body.transactionDate ? new Date(body.transactionDate) : existingExpense.transactionDate,
            }
        })

        // Update Expense record
        const expense = await tx.expense.update({
            where: { id },
            data: {
                category: body.category || existingExpense.category,
                description: body.description || existingExpense.description,
                amount,
                currency,
                exchangeRate,
                amountIdr,
                transactionDate: body.transactionDate ? new Date(body.transactionDate) : existingExpense.transactionDate,
                paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : existingExpense.paymentMethod,
                receipt: body.receipt !== undefined ? body.receipt : existingExpense.receipt,
                notes: body.notes !== undefined ? body.notes : existingExpense.notes,
            }
        })

        return expense
    })
})
