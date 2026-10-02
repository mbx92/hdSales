import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'
import { createSparepartSku, isMeaningfulSku } from '../../utils/inventorySku'
import { getUserFromEvent } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = event.context.params?.id
    const body = await readBody(event)
    const currentUser = getUserFromEvent(event)

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

    if (body.stock !== undefined && parseInt(body.stock) !== existing.stock) {
        throw createError({
            statusCode: currentUser?.role === 'CASHIER' ? 403 : 400,
            message: 'Perubahan stok harus melalui Penyesuaian Stok agar batch FIFO tetap akurat',
        })
    }

    if (body.category === 'SERVICE' && existing.category !== 'SERVICE' && existing.stock > 0) {
        throw createError({
            statusCode: 400,
            message: 'Habiskan atau sesuaikan stok ke 0 sebelum mengubah item menjadi SERVICE',
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
    if (body.minStock !== undefined) data.minStock = parseInt(body.minStock)
    if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
    if (body.status) data.status = body.status

    const sparepart = await prisma.sparepart.update({
        where: { id },
        data
    })

    return sparepart
})
