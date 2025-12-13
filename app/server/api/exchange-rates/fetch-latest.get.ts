// Fetch latest exchange rate from free API (ExchangeRate-API.com)
export default defineEventHandler(async (event) => {
    try {
        // Using ExchangeRate-API's free Open API (no key required)
        const response = await $fetch<{
            result: string
            time_last_update_utc: string
            rates: Record<string, number>
        }>('https://open.er-api.com/v6/latest/USD')

        if (response.result !== 'success') {
            throw new Error('Failed to fetch exchange rate')
        }

        const idrRate = response.rates.IDR

        return {
            success: true,
            rate: idrRate,
            lastUpdate: response.time_last_update_utc,
            source: 'ExchangeRate-API (Open API)'
        }
    } catch (error: any) {
        console.error('Exchange rate API error:', error)

        // Return a fallback/default rate if API fails
        return {
            success: false,
            rate: 15500, // Fallback rate
            error: 'Gagal mengambil kurs dari API. Menggunakan nilai default.',
            source: 'Fallback'
        }
    }
})
