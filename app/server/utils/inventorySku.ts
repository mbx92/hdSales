const SPAREPART_SKU_PREFIXES: Record<string, string> = {
    SERVICE: 'SRV',
    SPAREPART: 'SPR',
    ACCESSORY: 'ACC',
    ACCESSORIES: 'ACC',
    APPAREL: 'APP',
    OTHER: 'OTH',
}

const createSkuSuffix = (id: string) => {
    return id.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase()
}

export const isMeaningfulSku = (sku: string | null | undefined) => {
    return Boolean(sku?.trim() && /[A-Za-z0-9]/.test(sku))
}

export const createSparepartSku = (category: string, id: string) => {
    const prefix = SPAREPART_SKU_PREFIXES[category] || 'ITM'
    return `${prefix}-${createSkuSuffix(id)}`
}

export const createProductSku = (id: string) => {
    return `PRD-${createSkuSuffix(id)}`
}
