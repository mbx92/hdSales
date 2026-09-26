import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { createSparepartSku, isMeaningfulSku } from '../../utils/inventorySku'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id
    const body = await readBody(event)

    // Verify sparepart belongs to user
    const existing = await prisma.sparepart.findFirst({
        where: { id, userId }
    })

    if (!existing) {
        throw createError({
            statusCode: 404,
            message: 'Sparepart tidak ditemukan'
        })
    }

    const data: any = {}
    if (body.name) data.name = body.name
    if (body.category) {
        data.category = body.category
    }
    if (!isMeaningfulSku(existing.sku) || (body.category && body.category !== existing.category)) {
        data.sku = createSparepartSku(body.category || existing.category, existing.id)
    }
    if (body.brand !== undefined) data.brand = body.brand
    if (body.description !== undefined) data.description = body.description
    if (body.purchasePrice) data.purchasePrice = parseFloat(body.purchasePrice)
    if (body.sellingPrice) data.sellingPrice = parseFloat(body.sellingPrice)
    if (body.currency) data.currency = body.currency
    if (body.stock !== undefined) data.stock = parseInt(body.stock)
    if (body.minStock !== undefined) data.minStock = parseInt(body.minStock)
    if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
    if (body.status) data.status = body.status

    const sparepart = await prisma.sparepart.update({
        where: { id },
        data
    })

    return sparepart
})
