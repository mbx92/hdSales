import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.sku || !body.name) {
        throw createError({
            statusCode: 400,
            message: 'SKU dan Nama wajib diisi'
        })
    }

    // Check SKU duplicate
    const existing = await prisma.sparepart.findUnique({
        where: { sku: body.sku }
    })

    if (existing) {
        throw createError({
            statusCode: 400,
            message: 'SKU sudah digunakan'
        })
    }

    const sparepart = await prisma.sparepart.create({
        data: {
            sku: body.sku,
            name: body.name,
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

    return sparepart
})
