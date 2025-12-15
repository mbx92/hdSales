import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Expense ID is required'
        })
    }

    const expense = await prisma.expense.findUnique({
        where: { id }
    })

    if (!expense) {
        throw createError({
            statusCode: 404,
            message: 'Expense tidak ditemukan'
        })
    }

    return await prisma.$transaction(async (tx) => {
        // Delete expense first
        await tx.expense.delete({
            where: { id }
        })

        // Delete related CashFlow
        await tx.cashFlow.delete({
            where: { id: expense.cashFlowId }
        })

        return { success: true, message: 'Expense berhasil dihapus' }
    })
})
