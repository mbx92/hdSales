import prisma from './prisma'

type InvoicePrefix = 'DHD' | 'PRD' | 'SPR'

/**
 * Generate unique invoice number with race-condition protection
 * Format: PREFIX-YYMM-NNNN (e.g. DHD-2312-0001)
 * 
 * Uses Prisma $transaction with upsert to atomically increment counter
 * Invoice numbers are now per-user
 */
export async function generateInvoiceNumber(
    prefix: InvoicePrefix,
    date: Date = new Date(),
    userId: string
): Promise<string> {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const yearShort = year.toString().slice(-2)
    const monthStr = month.toString().padStart(2, '0')

    // Use transaction to ensure atomic update
    const counter = await prisma.$transaction(async (tx) => {
        // Try to get existing counter for this user
        const existing = await tx.invoiceCounter.findUnique({
            where: {
                userId_prefix_year_month: {
                    userId,
                    prefix,
                    year,
                    month,
                },
            },
        })

        if (existing) {
            // Increment existing counter
            return await tx.invoiceCounter.update({
                where: { id: existing.id },
                data: { lastNumber: existing.lastNumber + 1 },
            })
        } else {
            // Create new counter starting at 1
            return await tx.invoiceCounter.create({
                data: {
                    userId,
                    prefix,
                    year,
                    month,
                    lastNumber: 1,
                },
            })
        }
    })

    // Format: DHD-2312-0001
    const sequence = counter.lastNumber.toString().padStart(4, '0')
    return `${prefix}-${yearShort}${monthStr}-${sequence}`
}
