import prisma from './prisma'

export interface CurrencyAmount {
    amount: number
    currency: 'IDR' | 'USD'
    amountIdr: number
    exchangeRate: number
}

export async function getLatestExchangeRate(fromCurrency: string = 'USD', toCurrency: string = 'IDR'): Promise<number> {
    const rate = await prisma.exchangeRate.findFirst({
        where: {
            fromCurrency,
            toCurrency,
        },
        orderBy: {
            effectiveDate: 'desc',
        },
    })

    // Default rate if none found
    return rate?.rate ?? 15500
}

export async function convertToIdr(amount: number, currency: string): Promise<CurrencyAmount> {
    if (currency === 'IDR') {
        return {
            amount,
            currency: 'IDR',
            amountIdr: amount,
            exchangeRate: 1,
        }
    }

    const exchangeRate = await getLatestExchangeRate(currency, 'IDR')
    return {
        amount,
        currency: currency as 'USD',
        amountIdr: amount * exchangeRate,
        exchangeRate,
    }
}

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
    if (currency === 'IDR') {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function parseCurrencyInput(value: string): number {
    // Remove currency symbols and thousands separators
    const cleaned = value.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
}
