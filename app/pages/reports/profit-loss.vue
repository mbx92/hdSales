<script setup lang="ts">
import { IconTrendingUp, IconTrendingDown, IconReceipt, IconFilter, IconChevronDown, IconChevronUp, IconFileSpreadsheet, IconFileTypePdf, IconMotorbike, IconBox } from '@tabler/icons-vue'
import { useExport } from '~/composables/useExport'

const { exportPnLToExcel, exportPnLToPDF } = useExport()
const { showError } = useAlert()

const filterDateRange = ref('month')
const customStartDate = ref('')
const customEndDate = ref('')
const expandedRows = ref<Set<string>>(new Set())
const exportingExcel = ref(false)
const exportingPDF = ref(false)

const dateRangeOptions = [
    { value: 'month', label: 'Bulan Ini' },
    { value: '3months', label: '3 Bulan' },
    { value: '6months', label: '6 Bulan' },
    { value: 'year', label: 'Tahun Ini' },
    { value: 'custom', label: 'Custom' },
]

const queryParams = computed(() => {
    const params: Record<string, string> = {
        dateRange: filterDateRange.value,
    }
    if (filterDateRange.value === 'custom') {
        if (customStartDate.value) params.startDate = customStartDate.value
        if (customEndDate.value) params.endDate = customEndDate.value
    }
    return params
})

const { data: report, pending } = await useFetch('/api/reports/profit-loss', {
    query: queryParams,
    watch: [queryParams],
})

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value)
}

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

const toggleRow = (id: string) => {
    if (expandedRows.value.has(id)) {
        expandedRows.value.delete(id)
    } else {
        expandedRows.value.add(id)
    }
}

const isRowExpanded = (id: string) => expandedRows.value.has(id)

const toggleAllRows = () => {
    if (expandedRows.value.size === report.value?.salesDetails?.length) {
        expandedRows.value.clear()
    } else {
        report.value?.salesDetails?.forEach((sale: any) => {
            expandedRows.value.add(sale.id)
        })
    }
}

const handleExportExcel = async () => {
    if (!report.value) return
    exportingExcel.value = true
    try {
        await exportPnLToExcel(report.value.salesDetails, report.value.summary, report.value.period, report.value.categoryBreakdown)
    } catch (error) {
        console.error('Export Excel error:', error)
        showError('Gagal export Excel')
    } finally {
        exportingExcel.value = false
    }
}

const handleExportPDF = async () => {
    if (!report.value) return
    exportingPDF.value = true
    try {
        await exportPnLToPDF(report.value.salesDetails, report.value.summary, report.value.period, report.value.categoryBreakdown)
    } catch (error) {
        console.error('Export PDF error:', error)
        showError('Gagal export PDF')
    } finally {
        exportingPDF.value = false
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 class="text-3xl font-bold">Laporan Profit & Loss</h1>
                <p class="text-base-content/60">Analisis pendapatan dan keuntungan</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <NuxtLink to="/reports" class="btn btn-outline btn-sm">Transaksi</NuxtLink>
                <NuxtLink to="/reports/inventory" class="btn btn-outline btn-sm">Inventory</NuxtLink>
                <button @click="handleExportExcel" class="btn btn-outline btn-sm gap-1" :disabled="!report?.salesDetails?.length || exportingExcel">
                    <span v-if="exportingExcel" class="loading loading-spinner loading-xs"></span>
                    <IconFileSpreadsheet v-else class="w-4 h-4" :stroke-width="1.5" />
                    Excel
                </button>
                <button @click="handleExportPDF" class="btn btn-primary btn-sm gap-1" :disabled="!report?.salesDetails?.length || exportingPDF">
                    <span v-if="exportingPDF" class="loading loading-spinner loading-xs"></span>
                    <IconFileTypePdf v-else class="w-4 h-4" :stroke-width="1.5" />
                    PDF
                </button>
            </div>
        </div>

        <!-- Filters -->
        <div class="card bg-base-200 border border-base-300">
            <div class="card-body py-4">
                <div class="flex items-center gap-2 mb-3">
                    <IconFilter class="w-5 h-5" :stroke-width="1.5" />
                    <span class="font-semibold">Filter Periode</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="form-control">
                        <select v-model="filterDateRange" class="select select-bordered select-sm bg-base-300">
                            <option v-for="opt in dateRangeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                        </select>
                    </div>
                    <div v-if="filterDateRange === 'custom'" class="form-control md:col-span-2">
                        <div class="flex gap-2">
                            <input v-model="customStartDate" type="date" class="input input-bordered input-sm bg-base-300 flex-1" />
                            <span class="self-center">-</span>
                            <input v-model="customEndDate" type="date" class="input input-bordered input-sm bg-base-300 flex-1" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="pending" class="flex items-center justify-center py-12">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <template v-else-if="report">
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <p class="text-xs text-base-content/60">Total Revenue</p>
                        <p class="text-2xl font-bold text-success">{{ formatCurrency(report.summary.totalRevenue) }}</p>
                        <p class="text-xs text-base-content/60">{{ report.summary.totalTransactions }} transaksi</p>
                    </div>
                </div>
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <p class="text-xs text-base-content/60">Total HPP</p>
                        <p class="text-2xl font-bold text-error">{{ formatCurrency(report.summary.totalHPP) }}</p>
                    </div>
                </div>
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <p class="text-xs text-base-content/60">Gross Profit</p>
                        <p :class="['text-2xl font-bold', report.summary.grossProfit >= 0 ? 'text-success' : 'text-error']">
                            {{ formatCurrency(report.summary.grossProfit) }}
                        </p>
                    </div>
                </div>
                <div class="card bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30">
                    <div class="card-body py-4">
                        <p class="text-xs text-base-content/60">Profit Margin</p>
                        <div class="flex items-center gap-2">
                            <IconTrendingUp v-if="report.summary.profitMargin >= 0" class="w-6 h-6 text-success" :stroke-width="1.5" />
                            <IconTrendingDown v-else class="w-6 h-6 text-error" :stroke-width="1.5" />
                            <span :class="['text-2xl font-bold', report.summary.profitMargin >= 0 ? 'text-success' : 'text-error']">
                                {{ report.summary.profitMargin.toFixed(1) }}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- P&L Statement Card -->
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <h2 class="card-title text-lg mb-4">Laporan Laba Rugi</h2>
                    
                    <div class="overflow-x-auto">
                        <table class="table table-sm">
                            <tbody>
                                <!-- Operating Revenue -->
                                <tr class="bg-base-300/50">
                                    <td colspan="2" class="font-bold">PENDAPATAN OPERASIONAL</td>
                                    <td class="text-right"></td>
                                </tr>
                                
                                <!-- Motor Revenue Details -->
                                <tr class="bg-base-300/30">
                                    <td colspan="2" class="pl-4 font-semibold">Penjualan Motor</td>
                                    <td class="text-right font-mono">{{ formatCurrency(report.categoryBreakdown.motorcycle.totalRevenue) }}</td>
                                </tr>
                                <template v-for="sale in report.salesDetails.filter((s: any) => s.type === 'Motor')" :key="sale.id">
                                    <tr>
                                        <td class="pl-8 text-sm" colspan="2">{{ sale.name }}</td>
                                        <td class="text-right font-mono text-sm">{{ formatCurrency(sale.sellingPrice) }}</td>
                                    </tr>
                                </template>
                                
                                <!-- Product Revenue Details -->
                                <tr class="bg-base-300/30">
                                    <td colspan="2" class="pl-4 font-semibold">Penjualan Produk</td>
                                    <td class="text-right font-mono">{{ formatCurrency(report.categoryBreakdown.product.totalRevenue) }}</td>
                                </tr>
                                <template v-for="sale in report.salesDetails.filter((s: any) => s.type === 'Product')" :key="sale.id">
                                    <tr>
                                        <td class="pl-8 text-sm" colspan="2">{{ sale.name }}</td>
                                        <td class="text-right font-mono text-sm">{{ formatCurrency(sale.sellingPrice) }}</td>
                                    </tr>
                                </template>
                                
                                <tr class="border-t-2 border-base-300">
                                    <td colspan="2" class="font-bold">Total Pendapatan Operasional</td>
                                    <td class="text-right font-mono font-bold text-success">{{ formatCurrency(report.summary.totalRevenue) }}</td>
                                </tr>
                                
                                <!-- Empty row separator -->
                                <tr><td colspan="3" class="py-2"></td></tr>
                                
                                <!-- HPP Section -->
                                <tr class="bg-base-300/50">
                                    <td colspan="2" class="font-bold">HARGA POKOK PENJUALAN (HPP)</td>
                                    <td class="text-right"></td>
                                </tr>
                                
                                <!-- Motor HPP Details -->
                                <tr class="bg-base-300/30">
                                    <td colspan="2" class="pl-4 font-semibold">HPP Motor</td>
                                    <td class="text-right font-mono">{{ formatCurrency(report.categoryBreakdown.motorcycle.totalHPP) }}</td>
                                </tr>
                                <template v-for="sale in report.salesDetails.filter((s: any) => s.type === 'Motor')" :key="'hpp-'+sale.id">
                                    <tr>
                                        <td class="pl-8 text-sm">{{ sale.name }}</td>
                                        <td class="text-right text-xs text-base-content/60">{{ sale.costBreakdown?.length || 0 }} biaya</td>
                                        <td class="text-right font-mono text-sm">{{ formatCurrency(sale.hpp) }}</td>
                                    </tr>
                                    <template v-if="sale.costBreakdown?.length">
                                        <tr v-for="(cost, idx) in sale.costBreakdown" :key="'cost-'+sale.id+'-'+idx">
                                            <td class="pl-12 text-xs text-base-content/60" colspan="2">- {{ cost.description || cost.component }}</td>
                                            <td class="text-right font-mono text-xs text-base-content/60">{{ formatCurrency(cost.amount) }}</td>
                                        </tr>
                                    </template>
                                </template>
                                
                                <!-- Product HPP Details -->
                                <tr class="bg-base-300/30">
                                    <td colspan="2" class="pl-4 font-semibold">HPP Produk</td>
                                    <td class="text-right font-mono">{{ formatCurrency(report.categoryBreakdown.product.totalHPP) }}</td>
                                </tr>
                                <template v-for="sale in report.salesDetails.filter((s: any) => s.type === 'Product')" :key="'hpp-'+sale.id">
                                    <tr>
                                        <td class="pl-8 text-sm">{{ sale.name }}</td>
                                        <td class="text-right text-xs text-base-content/60">{{ sale.costBreakdown?.length || 0 }} biaya</td>
                                        <td class="text-right font-mono text-sm">{{ formatCurrency(sale.hpp) }}</td>
                                    </tr>
                                    <template v-if="sale.costBreakdown?.length">
                                        <tr v-for="(cost, idx) in sale.costBreakdown" :key="'cost-'+sale.id+'-'+idx">
                                            <td class="pl-12 text-xs text-base-content/60" colspan="2">- {{ cost.description || cost.component }}</td>
                                            <td class="text-right font-mono text-xs text-base-content/60">{{ formatCurrency(cost.amount) }}</td>
                                        </tr>
                                    </template>
                                </template>
                                
                                <tr class="border-t-2 border-base-300">
                                    <td colspan="2" class="font-bold">Total HPP</td>
                                    <td class="text-right font-mono font-bold text-error">{{ formatCurrency(report.summary.totalHPP) }}</td>
                                </tr>
                                
                                <!-- Empty row separator -->
                                <tr><td colspan="3" class="py-2"></td></tr>
                                
                                <!-- Gross Profit -->
                                <tr class="bg-success/20">
                                    <td colspan="2" class="font-bold">LABA KOTOR (GROSS PROFIT)</td>
                                    <td :class="['text-right font-mono font-bold text-lg', report.summary.grossProfit >= 0 ? 'text-success' : 'text-error']">
                                        {{ formatCurrency(report.summary.grossProfit) }}
                                    </td>
                                </tr>
                                
                                <!-- Empty row separator -->
                                <tr><td colspan="3" class="py-2"></td></tr>
                                
                                <!-- Net Profit -->
                                <tr class="bg-primary/20">
                                    <td colspan="2" class="font-bold">LABA BERSIH (NET PROFIT)</td>
                                    <td :class="['text-right font-mono font-bold text-lg', report.summary.grossProfit >= 0 ? 'text-success' : 'text-error']">
                                        {{ formatCurrency(report.summary.grossProfit) }}
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" class="font-semibold">Margin Laba</td>
                                    <td :class="['text-right font-mono font-bold', report.summary.profitMargin >= 0 ? 'text-success' : 'text-error']">
                                        {{ report.summary.profitMargin.toFixed(1) }}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Category Breakdown -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Motorcycle Stats -->
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body">
                        <h2 class="card-title text-lg"><IconMotorbike class="w-5 h-5" :stroke-width="1.5" /> Penjualan Motor</h2>
                        <div class="space-y-3 mt-2">
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Jumlah Terjual</span>
                                <span class="badge badge-primary">{{ report.categoryBreakdown.motorcycle.count }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Revenue</span>
                                <span class="font-mono text-success">{{ formatCurrency(report.categoryBreakdown.motorcycle.totalRevenue) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">HPP</span>
                                <span class="font-mono text-error">{{ formatCurrency(report.categoryBreakdown.motorcycle.totalHPP) }}</span>
                            </div>
                            <div class="divider my-1"></div>
                            <div class="flex justify-between">
                                <span class="font-medium">Profit</span>
                                <span :class="['font-mono font-bold', report.categoryBreakdown.motorcycle.totalProfit >= 0 ? 'text-success' : 'text-error']">
                                    {{ formatCurrency(report.categoryBreakdown.motorcycle.totalProfit) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Product Stats -->
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body">
                        <h2 class="card-title text-lg"><IconBox class="w-5 h-5" :stroke-width="1.5" /> Penjualan Product</h2>
                        <div class="space-y-3 mt-2">
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Jumlah Terjual</span>
                                <span class="badge badge-secondary">{{ report.categoryBreakdown.product.count }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">Revenue</span>
                                <span class="font-mono text-success">{{ formatCurrency(report.categoryBreakdown.product.totalRevenue) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-base-content/60">HPP</span>
                                <span class="font-mono text-error">{{ formatCurrency(report.categoryBreakdown.product.totalHPP) }}</span>
                            </div>
                            <div class="divider my-1"></div>
                            <div class="flex justify-between">
                                <span class="font-medium">Profit</span>
                                <span :class="['font-mono font-bold', report.categoryBreakdown.product.totalProfit >= 0 ? 'text-success' : 'text-error']">
                                    {{ formatCurrency(report.categoryBreakdown.product.totalProfit) }}
                                </span>
                            </div>
                        </div>
                        <!-- Per-category breakdown -->
                        <div v-if="Object.keys(report.categoryBreakdown.product.categories).length > 0" class="mt-4">
                            <p class="text-sm text-base-content/60 mb-2">Per Kategori:</p>
                            <div class="space-y-2">
                                <div v-for="(cat, name) in report.categoryBreakdown.product.categories" :key="name" class="flex justify-between text-sm">
                                    <span>{{ name }} <span class="badge badge-xs">{{ cat.count }}×</span></span>
                                    <span class="font-mono">{{ formatCurrency(cat.profit) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sales Details with Collapsible -->
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <IconReceipt class="w-5 h-5" :stroke-width="1.5" />
                            <h2 class="card-title text-lg">Detail Penjualan</h2>
                            <span class="badge badge-primary">{{ report.salesDetails.length }}</span>
                        </div>
                        <button v-if="report.salesDetails.length" @click="toggleAllRows" class="btn btn-xs btn-ghost">
                            {{ expandedRows.size === report.salesDetails.length ? 'Collapse All' : 'Expand All' }}
                        </button>
                    </div>

                    <div v-if="report.salesDetails.length" class="space-y-2">
                        <div v-for="sale in report.salesDetails" :key="sale.id" class="border border-base-300 rounded-lg overflow-hidden">
                            <!-- Header Row -->
                            <div @click="toggleRow(sale.id)" class="flex items-center gap-3 p-3 bg-base-300/30 cursor-pointer hover:bg-base-300/50 transition-colors">
                                <button class="btn btn-xs btn-ghost btn-square">
                                    <IconChevronDown v-if="!isRowExpanded(sale.id)" class="w-4 h-4" />
                                    <IconChevronUp v-else class="w-4 h-4" />
                                </button>
                                
                                <div class="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2 text-sm items-center">
                                    <div class="font-mono text-xs">{{ sale.invoiceNumber || '-' }}</div>
                                    <div class="whitespace-nowrap text-xs">{{ formatDate(sale.saleDate) }}</div>
                                    <div class="md:col-span-2">
                                        <span class="badge badge-xs mr-1" :class="sale.type === 'Motor' ? 'badge-primary' : 'badge-secondary'">{{ sale.type }}</span>
                                        <span class="text-sm">{{ sale.name }}</span>
                                    </div>
                                    <div class="text-right font-mono text-sm text-success">{{ formatCurrency(sale.sellingPrice) }}</div>
                                    <div :class="['text-right font-mono font-bold text-sm', sale.profit >= 0 ? 'text-success' : 'text-error']">
                                        {{ formatCurrency(sale.profit) }}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Expanded Content -->
                            <div v-if="isRowExpanded(sale.id)" class="p-6 bg-base-100 border-t border-base-300">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <!-- Left: Buyer Info & Summary -->
                                    <div class="space-y-6">
                                        <div>
                                            <p class="text-base font-semibold text-base-content/70 mb-3">Informasi Pembeli</p>
                                            <div class="space-y-2">
                                                <p class="text-base"><span class="text-base-content/60">Nama:</span> <span class="font-medium">{{ sale.buyerName }}</span></p>
                                                <p class="text-base"><span class="text-base-content/60">Metode:</span> <span class="font-medium">{{ sale.paymentMethod }}</span></p>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <p class="text-base font-semibold text-base-content/70 mb-3">Ringkasan</p>
                                            <div class="space-y-2">
                                                <div class="flex justify-between text-base">
                                                    <span class="text-base-content/60">Harga Jual:</span>
                                                    <span class="font-mono font-medium text-success">{{ formatCurrency(sale.sellingPrice) }}</span>
                                                </div>
                                                <div class="flex justify-between text-base">
                                                    <span class="text-base-content/60">Total HPP:</span>
                                                    <span class="font-mono font-medium text-error">{{ formatCurrency(sale.hpp) }}</span>
                                                </div>
                                                <div class="divider my-2"></div>
                                                <div class="flex justify-between font-bold text-lg">
                                                    <span>Profit:</span>
                                                    <span :class="sale.profit >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(sale.profit) }}</span>
                                                </div>
                                                <div class="flex justify-between text-sm">
                                                    <span class="text-base-content/60">Margin:</span>
                                                    <span class="font-medium">{{ sale.profitMargin?.toFixed(1) }}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Right: Cost Breakdown -->
                                    <div>
                                        <p class="text-base font-semibold text-base-content/70 mb-3">Breakdown Biaya (HPP)</p>
                                        <div v-if="sale.costBreakdown?.length" class="space-y-3">
                                            <div 
                                                v-for="(cost, idx) in sale.costBreakdown" 
                                                :key="idx" 
                                                class="flex justify-between items-start p-3 bg-base-200 rounded-lg"
                                            >
                                                <div>
                                                    <span class="badge badge-sm badge-outline mr-2">{{ cost.component }}</span>
                                                    <span class="text-base">{{ cost.description || cost.component }}</span>
                                                </div>
                                                <span class="font-mono text-base font-medium text-error whitespace-nowrap">{{ formatCurrency(cost.amount) }}</span>
                                            </div>
                                            <div class="flex justify-between font-bold pt-3 border-t border-base-300 text-lg">
                                                <span>Total HPP:</span>
                                                <span class="text-error">{{ formatCurrency(sale.hpp) }}</span>
                                            </div>
                                        </div>
                                        <div v-else class="text-base text-base-content/40 py-6 text-center bg-base-200 rounded-lg">
                                            Tidak ada data biaya
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else class="text-center py-8 text-base-content/40">
                        Tidak ada penjualan pada periode ini
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
