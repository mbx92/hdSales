import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'ID motor tidak valid',
        })
    }

    const existingMotorcycle = await prisma.motorcycle.findUnique({
        where: { id },
    })

    if (!existingMotorcycle) {
        throw createError({
            statusCode: 404,
            message: 'Motor tidak ditemukan',
        })
    }

    const motorcycle = await prisma.motorcycle.update({
        where: { id },
        data: {
            vin: body.vin ?? existingMotorcycle.vin,
            brand: body.brand ?? existingMotorcycle.brand,
            model: body.model ?? existingMotorcycle.model,
            customModel: body.customModel ?? existingMotorcycle.customModel,
            year: body.year ? parseInt(body.year) : existingMotorcycle.year,
            color: body.color ?? existingMotorcycle.color,
            mileage: body.mileage !== undefined ? parseInt(body.mileage) : existingMotorcycle.mileage,
            condition: body.condition ?? existingMotorcycle.condition,
            currency: body.currency ?? existingMotorcycle.currency,
            status: body.status ?? existingMotorcycle.status,
            ownerName: body.ownerName ?? existingMotorcycle.ownerName,
            ownerPhone: body.ownerPhone ?? existingMotorcycle.ownerPhone,
            ownerLocation: body.ownerLocation ?? existingMotorcycle.ownerLocation,
            notes: body.notes ?? existingMotorcycle.notes,
            photos: body.photos ? JSON.stringify(body.photos) : existingMotorcycle.photos,
            documents: body.documents ? JSON.stringify(body.documents) : existingMotorcycle.documents,
            sellingPrice: body.sellingPrice ?? existingMotorcycle.sellingPrice,
        },
    })

    return motorcycle
})
