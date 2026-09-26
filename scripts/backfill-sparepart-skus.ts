import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createProductSku, createSparepartSku, isMeaningfulSku } from '../app/server/utils/inventorySku'

const prisma = new PrismaClient()
const isDryRun = process.argv.includes('--dry-run')

async function main() {
    const [spareparts, products] = await Promise.all([
        prisma.sparepart.findMany({
            select: { id: true, userId: true, name: true, category: true, sku: true },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.product.findMany({
            select: { id: true, userId: true, name: true, sku: true },
            orderBy: { createdAt: 'asc' },
        }),
    ])

    const sparepartPlans = spareparts.filter(item => !isMeaningfulSku(item.sku)).map(item => ({
        ...item,
        generatedSku: createSparepartSku(item.category, item.id),
    }))
    const productPlans = products.filter(item => !isMeaningfulSku(item.sku)).map(item => ({
        ...item,
        generatedSku: createProductSku(item.id),
    }))
    const reservedSparepartSkuKeys = new Set(
        spareparts
            .filter(item => isMeaningfulSku(item.sku))
            .map(item => `${item.userId}:${item.sku}`),
    )
    const reservedProductSkuKeys = new Set(
        products
            .filter(item => isMeaningfulSku(item.sku))
            .map(item => `${item.userId}:${item.sku}`),
    )

    for (const item of sparepartPlans) {
        const key = `${item.userId}:${item.generatedSku}`
        if (reservedSparepartSkuKeys.has(key)) {
            throw new Error(`Generated SKU collision: ${item.generatedSku}`)
        }
        reservedSparepartSkuKeys.add(key)
    }
    for (const item of productPlans) {
        const key = `${item.userId}:${item.generatedSku}`
        if (reservedProductSkuKeys.has(key)) {
            throw new Error(`Generated SKU collision: ${item.generatedSku}`)
        }
        reservedProductSkuKeys.add(key)
    }

    if (!isDryRun && (sparepartPlans.length > 0 || productPlans.length > 0)) {
        await prisma.$transaction([
            ...sparepartPlans.map(item => prisma.sparepart.update({
                where: { id: item.id },
                data: { sku: item.generatedSku },
            })),
            ...productPlans.map(item => prisma.product.update({
                where: { id: item.id },
                data: { sku: item.generatedSku },
            })),
        ])
    }

    for (const item of sparepartPlans) {
        console.log(`[Sparepart] ${item.name}: ${item.sku} -> ${item.generatedSku}`)
    }
    for (const item of productPlans) {
        console.log(`[Product] ${item.name}: ${item.sku} -> ${item.generatedSku}`)
    }

    const totalPlans = sparepartPlans.length + productPlans.length
    console.log(
        isDryRun
            ? `Dry run: ${totalPlans} invalid SKU(s) found.`
            : `Updated ${totalPlans} invalid SKU(s).`,
    )
}

main()
    .finally(async () => {
        await prisma.$disconnect()
    })
