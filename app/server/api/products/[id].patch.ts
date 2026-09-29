import prisma from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/requireUser'
import { createProductSku, isMeaningfulSku } from '~/server/utils/inventorySku'
import { getUserFromEvent } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
    const userId = requireUser(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const currentUser = getUserFromEvent(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID produk tidak valid',
        })
    }

    const product = await prisma.product.findFirst({
        where: { id, userId },
    })

    if (!product) {
        throw createError({
            statusCode: 404,
            message: 'Produk tidak ditemukan',
        })
    }

    if (currentUser?.role === 'CASHIER') {
        const submittedFields = Object.keys(body)
        if (submittedFields.some(field => field !== 'sellingPrice')) {
            throw createError({
                statusCode: 403,
                message: 'Kasir hanya dapat menentukan harga jual produk melalui POS',
            })
        }
    }

    if (product.status === 'SOLD') {
        throw createError({
            statusCode: 400,
            message: 'Produk yang sudah terjual tidak dapat diubah',
        })
    }

    // Update product
    const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
            category: body.category || product.category,
            customCategory: body.customCategory !== undefined ? body.customCategory : product.customCategory,
            name: body.name || product.name,
            sku: isMeaningfulSku(product.sku) ? product.sku : createProductSku(product.id),
            description: body.description !== undefined ? body.description : product.description,
            currency: body.currency || product.currency,
            sellingPrice: body.sellingPrice !== undefined ? parseFloat(body.sellingPrice) : product.sellingPrice,
            status: body.status || product.status,
            supplier: body.supplier !== undefined ? body.supplier : product.supplier,
            notes: body.notes !== undefined ? body.notes : product.notes,
        },
    })

    return updatedProduct
})
