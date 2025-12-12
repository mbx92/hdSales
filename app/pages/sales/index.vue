<script setup lang="ts">
import { IconCash } from '@tabler/icons-vue'

const { data, pending } = await useFetch('/api/sales')

const formatCurrency = (value: number, currency: string = 'IDR') => {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const totalSales = computed(() => {
  return data.value?.data?.reduce((sum: number, sale: any) => sum + sale.sellingPriceIdr, 0) || 0
})

const totalProfit = computed(() => {
  return data.value?.data?.reduce((sum: number, sale: any) => sum + (sale.profit * (sale.currency === 'USD' ? sale.exchangeRate : 1)), 0) || 0
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold">Riwayat Penjualan</h1>
      <p class="text-base-content/60">Daftar semua transaksi penjualan motor</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h3 class="text-sm font-medium text-base-content/60">Total Transaksi</h3>
          <p class="text-3xl font-bold text-primary">{{ data?.meta?.total || 0 }}</p>
        </div>
      </div>
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h3 class="text-sm font-medium text-base-content/60">Total Penjualan</h3>
          <p class="text-3xl font-bold text-success">{{ formatCurrency(totalSales) }}</p>
        </div>
      </div>
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h3 class="text-sm font-medium text-base-content/60">Total Profit</h3>
          <p :class="['text-3xl font-bold', totalProfit >= 0 ? 'text-success' : 'text-error']">
            {{ formatCurrency(totalProfit) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Sales Table -->
    <div v-else-if="data?.data?.length" class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Motor</th>
                <th>Pembeli</th>
                <th>Bayar</th>
                <th class="text-right">Harga Jual</th>
                <th class="text-right">Profit</th>
                <th class="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sale in data.data" :key="sale.id" class="hover">
                <td>{{ new Date(sale.saleDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <NuxtLink :to="`/motorcycles/${sale.motorcycleId}`" class="link link-primary">
                    {{ sale.motorcycle?.model }} {{ sale.motorcycle?.year }}
                  </NuxtLink>
                  <p class="text-xs text-base-content/60">{{ sale.motorcycle?.color }}</p>
                </td>
                <td>
                  <p class="font-medium">{{ sale.buyerName }}</p>
                  <p class="text-xs text-base-content/60">{{ sale.buyerPhone }}</p>
                </td>
                <td>
                  <span class="badge badge-outline">{{ sale.paymentMethod }}</span>
                </td>
                <td class="text-right font-mono">
                  {{ formatCurrency(sale.sellingPrice, sale.currency) }}
                </td>
                <td :class="['text-right font-mono font-bold', sale.profit >= 0 ? 'text-success' : 'text-error']">
                  {{ formatCurrency(sale.profit, sale.currency) }}
                </td>
                <td class="text-right">
                  <span :class="['badge', sale.profitMargin >= 10 ? 'badge-success' : 'badge-warning']">
                    {{ sale.profitMargin?.toFixed(1) }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-200 border border-base-300">
      <div class="card-body items-center text-center py-12">
        <IconCash class="w-16 h-16 text-base-content/20" :stroke-width="1" />
        <h3 class="text-xl font-bold mt-4">Belum Ada Penjualan</h3>
        <p class="text-base-content/60">Belum ada transaksi penjualan tercatat</p>
        <NuxtLink to="/motorcycles?status=AVAILABLE" class="btn btn-primary mt-4">
          Lihat Motor Tersedia
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
