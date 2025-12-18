import prisma from '../../utils/prisma'
import { requireUser } from '../../utils/requireUser'

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

    // Check SKU duplicate if changed
    if (body.sku && body.sku !== existing.sku) {
        const skuExists = await prisma.sparepart.findFirst({
            where: {
                userId,
                sku: body.sku,
                id: { not: id }
            }
        })
        if (skuExists) {
            throw createError({
                statusCode: 400,
                message: 'SKU sudah digunakan'
            })
        }
    }

    const data: any = {}
    if (body.sku) data.sku = body.sku
    if (body.name) data.name = body.name
    if (body.category) data.category = body.category
    if (body.brand !== undefined) data.brand = body.brand
    if (body.description !== undefined) data.description = body.description
    if (body.purchasePrice) data.purchasePrice = parseFloat(body.purchasePrice)
    if (body.sellingPrice) data.sellingPrice = parseFloat(body.sellingPrice)
    if (body.currency) data.currency = body.currency
    if (body.stock !== undefined) data.stock = parseInt(body.stock)
    if (body.minStock !== undefined) data.minStock = parseInt(body.minStock)
    if (body.supplierId !== undefined) data.supplierId = body.supplierId
    if (body.status) data.status = body.status

    const sparepart = await prisma.sparepart.update({
        where: { id },
        data
    })

    return sparepart
})
