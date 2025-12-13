<script setup lang="ts">
import { IconCash, IconMotorbike, IconTool, IconPrinter } from '@tabler/icons-vue'

const activeTab = ref<'motorcycle' | 'sparepart'>('motorcycle')

const { data, pending, refresh } = await useFetch('/api/sales', {
  query: {
    type: activeTab
  },
  watch: [activeTab]
})

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
  if (!data.value?.data) return 0
  
  if (activeTab.value === 'motorcycle') {
    return data.value.data.reduce((sum: number, sale: any) => sum + sale.sellingPriceIdr, 0)
  } else {
    return data.value.data.reduce((sum: number, sale: any) => sum + sale.total, 0)
  }
})

const totalProfit = computed(() => {
  if (!data.value?.data || activeTab.value !== 'motorcycle') return 0
  return data.value.data.reduce((sum: number, sale: any) => sum + (sale.profit * (sale.currency === 'USD' ? sale.exchangeRate : 1)), 0)
})

const totalItems = computed(() => {
  if (!data.value?.data || activeTab.value !== 'sparepart') return 0
  return data.value.data.reduce((sum: number, sale: any) => {
    return sum + (sale.items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0)
  }, 0)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold">Riwayat Penjualan</h1>
      <p class="text-base-content/60">Daftar semua transaksi penjualan motor dan sparepart</p>
    </div>

    <!-- Tabs -->
    <div role="tablist" class="tabs tabs-boxed bg-base-200 w-fit">
      <a 
        role="tab" 
        class="tab gap-2"
        :class="{ 'tab-active': activeTab === 'motorcycle' }"
        @click="activeTab = 'motorcycle'"
      >
        <IconMotorbike class="w-4 h-4" />
        Motor
      </a>
      <a 
        role="tab" 
        class="tab gap-2"
        :class="{ 'tab-active': activeTab === 'sparepart' }"
        @click="activeTab = 'sparepart'"
      >
        <IconTool class="w-4 h-4" />
        Sparepart
      </a>
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
      <div v-if="activeTab === 'motorcycle'" class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h3 class="text-sm font-medium text-base-content/60">Total Profit</h3>
          <p :class="['text-3xl font-bold', totalProfit >= 0 ? 'text-success' : 'text-error']">
            {{ formatCurrency(totalProfit) }}
          </p>
        </div>
      </div>
      <div v-else class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h3 class="text-sm font-medium text-base-content/60">Total Item Terjual</h3>
          <p class="text-3xl font-bold text-info">{{ totalItems }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Motorcycle Sales Table -->
    <div v-else-if="activeTab === 'motorcycle' && data?.data?.length" class="card bg-base-200 border border-base-300">
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
                <th class="text-center">Aksi</th>
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
                <td class="text-center">
                  <NuxtLink :to="`/sales/receipt/${sale.id}`" class="btn btn-sm btn-ghost gap-2" target="_blank">
                    <IconPrinter class="w-4 h-4" />
                    Kwitansi
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sparepart Sales Table -->
    <div v-else-if="activeTab === 'sparepart' && data?.data?.length" class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Bayar</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">Diskon</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sale in data.data" :key="sale.id" class="hover">
                <td>{{ new Date(sale.saleDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <NuxtLink 
                    :to="`/sales/sparepart-receipt/${sale.id}`" 
                    class="font-mono text-sm font-medium text-primary hover:underline cursor-pointer"
                    target="_blank"
                  >
                    {{ sale.invoiceNumber }}
                  </NuxtLink>
                </td>
                <td>
                  <p class="font-medium">{{ sale.customerName || '-' }}</p>
                  <p class="text-xs text-base-content/60">{{ sale.customerPhone || '-' }}</p>
                </td>
                <td>
                  <div class="space-y-1">
                    <div v-for="item in sale.items" :key="item.id" class="text-xs">
                      <span class="font-medium">{{ item.sparepart?.name }}</span>
                      <span class="text-base-content/60"> × {{ item.quantity }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge badge-outline">{{ sale.paymentMethod }}</span>
                </td>
                <td class="text-right font-mono">
                  {{ formatCurrency(sale.subtotal, sale.currency) }}
                </td>
                <td class="text-right font-mono text-error">
                  {{ sale.discount > 0 ? '-' + formatCurrency(sale.discount, sale.currency) : '-' }}
                </td>
                <td class="text-right font-mono font-bold text-success">
                  {{ formatCurrency(sale.total, sale.currency) }}
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
        <p class="text-base-content/60">
          {{ activeTab === 'motorcycle' ? 'Belum ada transaksi penjualan motor tercatat' : 'Belum ada transaksi penjualan sparepart tercatat' }}
        </p>
        <NuxtLink 
          :to="activeTab === 'motorcycle' ? '/motorcycles?status=AVAILABLE' : '/spareparts'" 
          class="btn btn-primary mt-4"
        >
          {{ activeTab === 'motorcycle' ? 'Lihat Motor Tersedia' : 'Lihat Sparepart' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
