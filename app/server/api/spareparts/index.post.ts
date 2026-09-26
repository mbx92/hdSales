import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { createSparepartSku } from '../../utils/inventorySku'
import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const body = await readBody(event)

    if (!body.name) {
        throw createError({
            statusCode: 400,
            message: 'Nama wajib diisi'
        })
    }

    const sparepart = await prisma.$transaction(async (tx) => {
        const created = await tx.sparepart.create({
            data: {
                userId,
                sku: `TMP-${randomUUID().toUpperCase()}`,
                name: body.name.trim(),
                category: body.category,
                brand: body.brand,
                description: body.description,
                purchasePrice: parseFloat(body.purchasePrice),
                sellingPrice: parseFloat(body.sellingPrice),
                currency: body.currency || 'IDR',
                stock: parseInt(body.stock || 0),
                minStock: parseInt(body.minStock || 1),
                supplierId: body.supplierId || undefined,
                status: body.status || 'ACTIVE',
            }
        })

        return await tx.sparepart.update({
            where: { id: created.id },
            data: { sku: createSparepartSku(created.category, created.id) },
        })
    })

    return sparepart
})
