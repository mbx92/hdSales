<script setup lang="ts">
import { IconFileSpreadsheet, IconFileTypePdf, IconFilter, IconCalendar, IconArrowUp, IconArrowDown, IconScale, IconTrendingUp, IconTrendingDown } from '@tabler/icons-vue'
import { useExport } from '~/composables/useExport'

const { exportToExcel, exportToPDF } = useExport()
const { showError } = useAlert()

// Filter state
const filterType = ref('all')
const filterCategory = ref('all')
const filterDateRange = ref('month')
const customStartDate = ref('')
const customEndDate = ref('')

const dateRangeOptions = [
    { value: 'week', label: 'Minggu Ini' },
    { value: 'month', label: 'Bulan Ini' },
    { value: '3months', label: '3 Bulan' },
    { value: '6months', label: '6 Bulan' },
    { value: 'year', label: 'Tahun Ini' },
    { value: 'all', label: 'Semua Waktu' },
    { value: 'custom', label: 'Custom' },
]

const typeOptions = [
    { value: 'all', label: 'Semua Tipe' },
    { value: 'INCOME', label: 'Pemasukan' },
    { value: 'OUTCOME', label: 'Pengeluaran' },
]

// Compute query params
const queryParams = computed(() => {
    const params: Record<string, string> = {
        type: filterType.value,
        category: filterCategory.value,
    }

    if (filterDateRange.value === 'custom') {
        if (customStartDate.value) params.startDate = customStartDate.value
        if (customEndDate.value) params.endDate = customEndDate.value
    } else {
        params.dateRange = filterDateRange.value
    }

    return params
})

// Fetch report data
const { data: report, pending, refresh } = await useFetch('/api/reports/transactions', {
    query: queryParams,
    watch: [queryParams],
})

// Format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value)
}

// Format date
const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

// Export loading states
const exportingExcel = ref(false)
const exportingPDF = ref(false)

// Export handlers
const handleExportExcel = async () => {
    if (!report.value) return
    exportingExcel.value = true
    try {
        await exportToExcel(report.value.data, report.value.summary)
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
        await exportToPDF(report.value.data, report.value.summary, report.value.filters)
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
                <h1 class="text-3xl font-bold">Laporan Transaksi</h1>
                <p class="text-base-content/60">Analisis keuangan dengan filter lengkap dan export</p>
            </div>
            <div class="flex gap-2">
                <button @click="handleExportExcel" class="btn btn-outline gap-2" :disabled="!report?.data?.length || exportingExcel">
                    <span v-if="exportingExcel" class="loading loading-spinner loading-sm"></span>
                    <IconFileSpreadsheet v-else class="w-5 h-5" :stroke-width="1.5" />
                    Export Excel
                </button>
                <button @click="handleExportPDF" class="btn btn-primary gap-2" :disabled="!report?.data?.length || exportingPDF">
                    <span v-if="exportingPDF" class="loading loading-spinner loading-sm"></span>
                    <IconFileTypePdf v-else class="w-5 h-5" :stroke-width="1.5" />
                    Export PDF
                </button>
            </div>
        </div>

        <!-- Filters -->
        <div class="card bg-base-200 border border-base-300">
            <div class="card-body py-4">
                <div class="flex items-center gap-2 mb-3">
                    <IconFilter class="w-5 h-5" :stroke-width="1.5" />
                    <span class="font-semibold">Filter</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <!-- Type Filter -->
                    <div class="form-control">
                        <label class="label py-1">
                            <span class="label-text text-xs">Tipe Transaksi</span>
                        </label>
                        <select v-model="filterType" class="select select-bordered select-sm bg-base-300">
                            <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>

                    <!-- Category Filter -->
                    <div class="form-control">
                        <label class="label py-1">
                            <span class="label-text text-xs">Kategori</span>
                        </label>
                        <select v-model="filterCategory" class="select select-bordered select-sm bg-base-300">
                            <option value="all">Semua Kategori</option>
                            <option v-for="cat in report?.categories" :key="cat" :value="cat">
                                {{ cat }}
                            </option>
                        </select>
                    </div>

                    <!-- Date Range Filter -->
                    <div class="form-control">
                        <label class="label py-1">
                            <span class="label-text text-xs">Rentang Waktu</span>
                        </label>
                        <select v-model="filterDateRange" class="select select-bordered select-sm bg-base-300">
                            <option v-for="opt in dateRangeOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>

                    <!-- Custom Date -->
                    <div v-if="filterDateRange === 'custom'" class="form-control md:col-span-1">
                        <label class="label py-1">
                            <span class="label-text text-xs">Tanggal Custom</span>
                        </label>
                        <div class="flex gap-2">
                            <input v-model="customStartDate" type="date" class="input input-bordered input-sm bg-base-300 flex-1" />
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
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-lg bg-success/20">
                                <IconArrowUp class="w-6 h-6 text-success" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Total Pemasukan</p>
                                <p class="text-xl font-bold text-success">{{ formatCurrency(report.summary.totalIncome) }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-lg bg-error/20">
                                <IconArrowDown class="w-6 h-6 text-error" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Total Pengeluaran</p>
                                <p class="text-xl font-bold text-error">{{ formatCurrency(report.summary.totalOutcome) }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div :class="['p-3 rounded-lg', report.summary.netBalance >= 0 ? 'bg-primary/20' : 'bg-warning/20']">
                                <IconScale :class="['w-6 h-6', report.summary.netBalance >= 0 ? 'text-primary' : 'text-warning']" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Saldo Bersih</p>
                                <p :class="['text-xl font-bold', report.summary.netBalance >= 0 ? 'text-primary' : 'text-warning']">
                                    {{ formatCurrency(report.summary.netBalance) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-lg bg-info/20">
                                <IconCalendar class="w-6 h-6 text-info" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Jumlah Transaksi</p>
                                <p class="text-xl font-bold text-info">{{ report.summary.transactionCount }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Net Profit Card -->
                <div class="card bg-gradient-to-br from-secondary/20 to-primary/20 border border-secondary/30">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div :class="['p-3 rounded-lg', (report.summary.netProfit || 0) >= 0 ? 'bg-success/30' : 'bg-error/30']">
                                <IconTrendingUp v-if="(report.summary.netProfit || 0) >= 0" class="w-6 h-6 text-success" :stroke-width="1.5" />
                                <IconTrendingDown v-else class="w-6 h-6 text-error" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Net Profit (Margin)</p>
                                <p :class="['text-xl font-bold', (report.summary.netProfit || 0) >= 0 ? 'text-success' : 'text-error']">
                                    {{ formatCurrency(report.summary.netProfit || 0) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Category Breakdown -->
            <div v-if="Object.keys(report.categoryTotals).length > 0" class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <h2 class="card-title text-lg">Ringkasan per Kategori</h2>
                    <div class="overflow-x-auto">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Kategori</th>
                                    <th class="text-right text-success">Pemasukan</th>
                                    <th class="text-right text-error">Pengeluaran</th>
                                    <th class="text-right">Selisih</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(totals, category) in report.categoryTotals" :key="category">
                                    <td class="font-medium">{{ category }}</td>
                                    <td class="text-right font-mono text-success">
                                        {{ totals.income > 0 ? formatCurrency(totals.income) : '-' }}
                                    </td>
                                    <td class="text-right font-mono text-error">
                                        {{ totals.outcome > 0 ? formatCurrency(totals.outcome) : '-' }}
                                    </td>
                                    <td :class="['text-right font-mono font-bold', totals.income - totals.outcome >= 0 ? 'text-success' : 'text-error']">
                                        {{ formatCurrency(totals.income - totals.outcome) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Transaction Table -->
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <h2 class="card-title text-lg">
                        Detail Transaksi
                        <span class="badge badge-primary">{{ report.data.length }}</span>
                    </h2>

                    <div v-if="report.data.length" class="overflow-x-auto">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Deskripsi</th>
                                    <th>Kategori</th>
                                    <th>Tipe</th>
                                    <th class="text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="tx in report.data" :key="tx.id" class="hover">
                                    <td class="whitespace-nowrap">{{ formatDate(tx.transactionDate) }}</td>
                                    <td>{{ tx.description }}</td>
                                    <td>
                                        <span class="badge badge-outline badge-sm">{{ tx.category }}</span>
                                    </td>
                                    <td>
                                        <span :class="['badge badge-sm', tx.type === 'INCOME' ? 'badge-success' : 'badge-error']">
                                            {{ tx.type === 'INCOME' ? 'Masuk' : 'Keluar' }}
                                        </span>
                                    </td>
                                    <td :class="['text-right font-mono font-semibold', tx.type === 'INCOME' ? 'text-success' : 'text-error']">
                                        {{ tx.type === 'INCOME' ? '+' : '-' }}{{ formatCurrency(tx.amountIdr) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-else class="text-center py-8 text-base-content/40">
                        Tidak ada transaksi untuk filter yang dipilih
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
