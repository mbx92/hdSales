import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    // Validate required fields
    if (!body.vin || !body.model || !body.year || !body.currency) {
        throw createError({
            statusCode: 400,
            message: 'VIN, model, year, dan currency harus diisi',
        })
    }

    // Check if VIN already exists
    const existingMotorcycle = await prisma.motorcycle.findUnique({
        where: { vin: body.vin },
    })

    if (existingMotorcycle) {
        throw createError({
            statusCode: 400,
            message: 'VIN sudah terdaftar',
        })
    }

    const motorcycle = await prisma.motorcycle.create({
        data: {
            vin: body.vin,
            brand: body.brand || 'Harley Davidson',
            model: body.model,
            customModel: body.customModel || null,
            year: parseInt(body.year),
            color: body.color,
            mileage: body.mileage ? parseInt(body.mileage) : null,
            condition: body.condition || 'USED',
            currency: body.currency,
            status: body.status || 'ON_PROGRESS',
            ownerName: body.ownerName,
            ownerPhone: body.ownerPhone,
            ownerLocation: body.ownerLocation,
            notes: body.notes,
            photos: body.photos ? JSON.stringify(body.photos) : '[]',
            documents: body.documents ? JSON.stringify(body.documents) : '[]',
        },
    })

    return motorcycle
})
