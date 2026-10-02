import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { createSparepartSku } from '../../utils/inventorySku'
import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const body = await readBody(event)
    const requestedStock = Number(body.stock || 0)

    if (!body.name) {
        throw createError({
            statusCode: 400,
            message: 'Nama wajib diisi'
        })
    }

    if (!Number.isInteger(requestedStock) || requestedStock < 0) {
        throw createError({
            statusCode: 400,
            message: 'Stok awal harus berupa bilangan bulat positif atau nol'
        })
    }

    const purchasePrice = Number(body.purchasePrice)
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
        throw createError({
            statusCode: 400,
            message: 'Harga beli tidak valid'
        })
    }

    const isService = body.category === 'SERVICE'
    const stock = isService ? 0 : requestedStock

    const sparepart = await prisma.$transaction(async (tx) => {
        const created = await tx.sparepart.create({
            data: {
                userId,
                sku: `TMP-${randomUUID().toUpperCase()}`,
                name: body.name.trim(),
                category: body.category,
                brand: body.brand,
                description: body.description,
                purchasePrice,
                sellingPrice: parseFloat(body.sellingPrice),
                currency: body.currency || 'IDR',
                stock,
                minStock: parseInt(body.minStock || 1),
                supplierId: body.supplierId || undefined,
                status: body.status || 'ACTIVE',
            }
        })

        const sparepart = await tx.sparepart.update({
            where: { id: created.id },
            data: { sku: createSparepartSku(created.category, created.id) },
        })

        if (stock > 0) {
            await tx.sparepartStockBatch.create({
                data: {
                    sparepartId: sparepart.id,
                    sourceType: 'OPENING_BALANCE',
                    initialQuantity: stock,
                    remainingQuantity: stock,
                    unitCost: purchasePrice,
                    receivedAt: sparepart.createdAt,
                },
            })
        }

        return sparepart
    })

    return sparepart
})
