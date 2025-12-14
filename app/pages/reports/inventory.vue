<script setup lang="ts">
import { IconBox, IconMotorbike, IconBuildingWarehouse, IconCurrencyDollar, IconFileSpreadsheet, IconFileTypePdf } from '@tabler/icons-vue'
import { useExport } from '~/composables/useExport'

const { exportInventoryToExcel, exportInventoryToPDF } = useExport()
const { showError } = useAlert()

const { data: report, pending } = await useFetch('/api/reports/inventory')

const exportingExcel = ref(false)
const exportingPDF = ref(false)

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

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ON_PROGRESS':
            return 'badge-warning'
        case 'AVAILABLE':
            return 'badge-success'
        default:
            return 'badge-ghost'
    }
}

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'ON_PROGRESS':
            return 'On Progress'
        case 'AVAILABLE':
            return 'Tersedia'
        default:
            return status
    }
}

const handleExportExcel = async () => {
    if (!report.value) return
    exportingExcel.value = true
    try {
        await exportInventoryToExcel(report.value.motorcycles, report.value.products, report.value.summary)
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
        await exportInventoryToPDF(report.value.motorcycles, report.value.products, report.value.summary)
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
                <h1 class="text-3xl font-bold">Laporan Inventory Asset</h1>
                <p class="text-base-content/60">Daftar semua aset motor dan product yang belum terjual</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <NuxtLink to="/reports/profit-loss" class="btn btn-outline btn-sm">
                    Lihat Profit & Loss
                </NuxtLink>
                <button @click="handleExportExcel" class="btn btn-outline btn-sm gap-1" :disabled="!report?.summary?.totalAssets || exportingExcel">
                    <span v-if="exportingExcel" class="loading loading-spinner loading-xs"></span>
                    <IconFileSpreadsheet v-else class="w-4 h-4" :stroke-width="1.5" />
                    Excel
                </button>
                <button @click="handleExportPDF" class="btn btn-primary btn-sm gap-1" :disabled="!report?.summary?.totalAssets || exportingPDF">
                    <span v-if="exportingPDF" class="loading loading-spinner loading-xs"></span>
                    <IconFileTypePdf v-else class="w-4 h-4" :stroke-width="1.5" />
                    PDF
                </button>
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
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-lg bg-primary/20">
                                <IconBuildingWarehouse class="w-6 h-6 text-primary" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Total Aset</p>
                                <p class="text-2xl font-bold">{{ report.summary.totalAssets }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-lg bg-success/20">
                                <IconCurrencyDollar class="w-6 h-6 text-success" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Total Nilai HPP</p>
                                <p class="text-xl font-bold text-success">{{ formatCurrency(report.summary.totalValue) }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-lg bg-info/20">
                                <IconMotorbike class="w-6 h-6 text-info" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Motor</p>
                                <p class="text-xl font-bold">{{ report.summary.motorcycle.count }}</p>
                                <p class="text-xs text-base-content/40">{{ formatCurrency(report.summary.motorcycle.totalValue) }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-lg bg-secondary/20">
                                <IconBox class="w-6 h-6 text-secondary" :stroke-width="1.5" />
                            </div>
                            <div>
                                <p class="text-xs text-base-content/60">Product</p>
                                <p class="text-xl font-bold">{{ report.summary.product.count }}</p>
                                <p class="text-xs text-base-content/40">{{ formatCurrency(report.summary.product.totalValue) }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Motorcycle Table -->
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <div class="flex items-center gap-2 mb-4">
                        <IconMotorbike class="w-5 h-5" :stroke-width="1.5" />
                        <h2 class="card-title text-lg">Inventory Motor</h2>
                        <span class="badge badge-info">{{ report.motorcycles.length }}</span>
                    </div>

                    <div v-if="report.motorcycles.length" class="overflow-x-auto">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Motor</th>
                                    <th>VIN</th>
                                    <th>Warna</th>
                                    <th>KM</th>
                                    <th>Status</th>
                                    <th class="text-right">HPP</th>
                                    <th>Tanggal Masuk</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="m in report.motorcycles" :key="m.id" class="hover">
                                    <td>
                                        <NuxtLink :to="`/motorcycles/${m.id}`" class="link link-primary no-underline hover:underline font-medium">
                                            {{ m.name }}
                                        </NuxtLink>
                                    </td>
                                    <td class="font-mono text-xs">{{ m.vin }}</td>
                                    <td>{{ m.color || '-' }}</td>
                                    <td>{{ m.mileage ? m.mileage.toLocaleString() + ' km' : '-' }}</td>
                                    <td>
                                        <span :class="['badge badge-sm', getStatusBadge(m.status)]">
                                            {{ getStatusLabel(m.status) }}
                                        </span>
                                    </td>
                                    <td class="text-right font-mono">{{ formatCurrency(m.totalCost) }}</td>
                                    <td class="whitespace-nowrap">{{ formatDate(m.createdAt) }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr class="bg-base-300/50">
                                    <td colspan="5" class="font-bold">Total</td>
                                    <td class="text-right font-mono font-bold">{{ formatCurrency(report.summary.motorcycle.totalValue) }}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div v-else class="text-center py-8 text-base-content/40">
                        Tidak ada motor dalam inventory
                    </div>
                </div>
            </div>

            <!-- Product Table -->
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <div class="flex items-center gap-2 mb-4">
                        <IconBox class="w-5 h-5" :stroke-width="1.5" />
                        <h2 class="card-title text-lg">Inventory Product</h2>
                        <span class="badge badge-secondary">{{ report.products.length }}</span>
                    </div>

                    <div v-if="report.products.length" class="overflow-x-auto">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Kategori</th>
                                    <th>Status</th>
                                    <th class="text-right">HPP</th>
                                    <th>Tanggal Masuk</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="p in report.products" :key="p.id" class="hover">
                                    <td>
                                        <NuxtLink :to="`/products/${p.id}`" class="link link-primary no-underline hover:underline font-medium">
                                            {{ p.name }}
                                        </NuxtLink>
                                    </td>
                                    <td class="font-mono text-xs">{{ p.sku || '-' }}</td>
                                    <td>
                                        <span class="badge badge-sm badge-outline">{{ p.category }}</span>
                                    </td>
                                    <td>
                                        <span :class="['badge badge-sm', getStatusBadge(p.status)]">
                                            {{ getStatusLabel(p.status) }}
                                        </span>
                                    </td>
                                    <td class="text-right font-mono">{{ formatCurrency(p.totalCost) }}</td>
                                    <td class="whitespace-nowrap">{{ formatDate(p.createdAt) }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr class="bg-base-300/50">
                                    <td colspan="4" class="font-bold">Total</td>
                                    <td class="text-right font-mono font-bold">{{ formatCurrency(report.summary.product.totalValue) }}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div v-else class="text-center py-8 text-base-content/40">
                        Tidak ada product dalam inventory
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
