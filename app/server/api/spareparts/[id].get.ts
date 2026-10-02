import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id

    const sparepart = await prisma.sparepart.findFirst({
        where: { id, userId },
        include: {
            supplier: true,
            saleItems: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    sale: true
                }
            },
            stockBatches: {
                where: { remainingQuantity: { gt: 0 } },
                orderBy: [
                    { receivedAt: 'asc' },
                    { createdAt: 'asc' },
                ],
            },
            stockAdjustments: {
                where: { type: 'PURCHASE' },
                orderBy: [
                    { createdAt: 'desc' },
                    { id: 'desc' },
                ],
                include: {
                    stockBatch: {
                        select: {
                            remainingQuantity: true,
                        },
                    },
                },
            }
        }
    })

    if (!sparepart) {
        throw createError({
            statusCode: 404,
            message: 'Sparepart tidak ditemukan'
        })
    }

    return {
        ...sparepart,
        inventoryValue: sparepart.stockBatches.reduce(
            (sum, batch) => sum + (batch.remainingQuantity * batch.unitCost),
            0,
        ),
    }
})
