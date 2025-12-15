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

    return expense
})
