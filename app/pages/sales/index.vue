<script setup lang="ts">
import { IconCash, IconMotorbike, IconBox, IconPrinter, IconCalendar, IconChevronLeft, IconChevronRight, IconSearch, IconPackage, IconDownload, IconReceipt, IconTrash } from '@tabler/icons-vue'

const activeTab = ref<'motorcycle' | 'product' | 'sparepart'>('motorcycle')
const page = ref(1)
const limit = ref(20)
const startDate = ref('')
const endDate = ref('')

// Computed properties for query params to ensure reactivity
const queryParams = computed(() => {
  const params: any = {
    type: activeTab.value,
    page: page.value,
    limit: limit.value
  }
  
  if (startDate.value) params.startDate = startDate.value
  if (endDate.value) params.endDate = endDate.value
  
  return params
})

const { data, pending, refresh } = await useFetch('/api/sales', {
  query: queryParams,
  watch: [activeTab, page, startDate, endDate]
})

// Reset page when filters change
watch([activeTab, startDate, endDate], () => {
  page.value = 1
})

const formatCurrency = (value: number, currency: string = 'IDR') => {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// Calculate totals from current page data (Note: for accurate global totals with pagination, 
// ideally the API should return global totals, which it seems to do in 'meta' or separate aggregation endpoints)
// Here we use the data from current page for display, but for "Total Sales" widgets we might want global stats.
// However, the current API seems to return paginated data. 
// For the summary cards, we probably want to show totals based on the *filtered* result set (all pages).
// The current `data.meta.total` gives count. The API might need enhancement for sum totals across all pages if that's critical.
// For now, let's keep the existing client-side sum logic but be aware it only sums the *current page*.
// To fix this accurately without backend changes, we'd need a separate stats endpoint.
// Let's rely on the user's current requirement for list filtering first.
// A common pattern is showing "Page Total" vs "Grand Total". 
// Let's modify the label to be clear or distinct.

const pageTotalSales = computed(() => {
  const salesData = data.value?.data
  if (!salesData) return 0
  
  if (activeTab.value === 'motorcycle') {
    // API returns 'sellingPrice' and 'currency'.
    // If mixed currency, simple sum is wrong. 
    // Assuming for now predominantly IDR or handled by display.
    return salesData.reduce((sum: number, sale: any) => sum + (sale.currency === 'IDR' ? sale.sellingPrice : sale.sellingPriceIdr || 0), 0)
  } else {
    // For products, use sellingPriceIdr
    return salesData.reduce((sum: number, sale: any) => sum + (sale.sellingPriceIdr || 0), 0)
  }
})

const pageTotalProfit = computed(() => {
  const salesData = data.value?.data
  if (!salesData) return 0
  // Works for both motorcycle and product
  return salesData.reduce((sum: number, sale: any) => sum + (sale.profit || 0), 0)
})

const pageTotalItems = computed(() => {
  const salesData = data.value?.data
  if (!salesData || activeTab.value !== 'product') return 0
  return salesData.length
})

const pageTotalSparepartOmset = computed(() => {
  if (activeTab.value !== 'sparepart') return 0
  const salesData = sparepartData.value?.data || []
  return salesData.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0)
})

// Type safe accessors to avoid union type errors
const motorcycleSales = computed(() => {
  if (activeTab.value !== 'motorcycle') return []
  return (data.value?.data || []) as any[]
})

const productSales = computed(() => {
  if (activeTab.value !== 'product') return []
  return (data.value?.data || []) as any[]
})

// Sparepart sales - separate fetch
const { data: sparepartData, pending: sparepartPending, refresh: refreshSpareparts } = await useFetch('/api/sparepart-sales', {
  query: computed(() => ({
    page: page.value,
    limit: limit.value,
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined
  })),
  watch: [page, startDate, endDate]
})

const sparepartSales = computed(() => {
  return (sparepartData.value?.data || []) as any[]
})

// Print modal for sparepart
const showPrintModal = ref(false)
const selectedSaleId = ref('')
const selectedInvoiceNumber = ref('')

const openPrintModal = (saleId: string, invoiceNumber: string) => {
  selectedSaleId.value = saleId
  selectedInvoiceNumber.value = invoiceNumber
  showPrintModal.value = true
}

// Delete sparepart sale
const showDeleteModal = ref(false)
const deleteTargetId = ref('')
const deleteTargetInvoice = ref('')
const deleteInProgress = ref(false)

const openDeleteModal = (id: string, invoiceNumber: string) => {
  deleteTargetId.value = id
  deleteTargetInvoice.value = invoiceNumber
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  deleteInProgress.value = true
  try {
    await $fetch(`/api/sparepart-sales/${deleteTargetId.value}`, { method: 'DELETE' })
    showDeleteModal.value = false
    await refreshSpareparts()
  } catch (error: any) {
    alert(error?.data?.message || 'Gagal menghapus transaksi')
  } finally {
    deleteInProgress.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Riwayat Penjualan</h1>
        <p class="text-base-content/60">Daftar semua transaksi penjualan motor dan product</p>
      </div>
      
      <!-- Date Filters -->
      <div class="flex flex-wrap items-end gap-2">
        <div class="form-control w-full md:w-auto">
          <label class="label py-1"><span class="label-text text-xs">Dari Tanggal</span></label>
          <div class="join">
            <button class="btn btn-sm join-item btn-square pointer-events-none">
              <IconCalendar class="w-4 h-4" />
            </button>
            <input 
              v-model="startDate" 
              type="date" 
              class="input input-sm input-bordered join-item" 
            />
          </div>
        </div>
        <div class="form-control w-full md:w-auto">
          <label class="label py-1"><span class="label-text text-xs">Sampai Tanggal</span></label>
          <div class="join">
             <button class="btn btn-sm join-item btn-square pointer-events-none">
              <IconCalendar class="w-4 h-4" />
            </button>
            <input 
              v-model="endDate" 
              type="date" 
              class="input input-sm input-bordered join-item" 
            />
          </div>
        </div>
        <button 
          v-if="startDate || endDate" 
          @click="startDate = ''; endDate = ''"
          class="btn btn-sm btn-ghost text-error"
        >
          Reset
        </button>
      </div>
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
        :class="{ 'tab-active': activeTab === 'product' }"
        @click="activeTab = 'product'"
      >
        <IconBox class="w-4 h-4" />
        Product
      </a>
      <a 
        role="tab" 
        class="tab gap-2"
        :class="{ 'tab-active': activeTab === 'sparepart' }"
        @click="activeTab = 'sparepart'"
      >
        <IconPackage class="w-4 h-4" />
        Service & Sparepart
      </a>
    </div>

    <!-- Summary Cards (Current Page) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body p-4">
          <h3 class="text-sm font-medium text-base-content/60">Total Transaksi</h3>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-bold text-primary">
              {{ activeTab === 'sparepart' ? (sparepartData?.meta?.total || 0) : (data?.meta?.total || 0) }}
            </p>
            <span class="text-xs text-base-content/40">transaksi</span>
          </div>
        </div>
      </div>
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body p-4">
          <h3 class="text-sm font-medium text-base-content/60">Omset (Halaman Ini)</h3>
          <p class="text-2xl font-bold text-success">
            {{ formatCurrency(activeTab === 'sparepart' ? pageTotalSparepartOmset : pageTotalSales) }}
          </p>
        </div>
      </div>
      <div v-if="activeTab === 'motorcycle'" class="card bg-base-200 border border-base-300">
        <div class="card-body p-4">
          <h3 class="text-sm font-medium text-base-content/60">Profit (Halaman Ini)</h3>
          <p :class="['text-2xl font-bold', pageTotalProfit >= 0 ? 'text-success' : 'text-error']">
            {{ formatCurrency(pageTotalProfit) }}
          </p>
        </div>
      </div>
      <div v-else-if="activeTab === 'sparepart'" class="card bg-base-200 border border-base-300">
        <div class="card-body p-4">
          <h3 class="text-sm font-medium text-base-content/60">Jumlah Item Terjual</h3>
          <p class="text-2xl font-bold text-info">{{ sparepartSales.reduce((sum, s) => sum + (s.items?.length || 0), 0) }}</p>
        </div>
      </div>
      <div v-else class="card bg-base-200 border border-base-300">
        <div class="card-body p-4">
          <h3 class="text-sm font-medium text-base-content/60">Item Terjual (Halaman Ini)</h3>
          <p class="text-2xl font-bold text-info">{{ pageTotalItems }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Motorcycle Sales Table -->
    <div v-else-if="activeTab === 'motorcycle' && motorcycleSales.length" class="card bg-base-200 border border-base-300">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr class="bg-base-200/50">
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
              <tr v-for="sale in motorcycleSales" :key="sale.id" class="hover border-b border-base-200/50 last:border-0">
                <td class="whitespace-nowrap">{{ new Date(sale.saleDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <NuxtLink :to="`/motorcycles/${sale.motorcycleId}`" class="link link-primary no-underline hover:underline font-medium">
                    {{ sale.motorcycle?.model }} {{ sale.motorcycle?.year }}
                  </NuxtLink>
                  <p class="text-xs text-base-content/60">{{ sale.motorcycle?.color }}</p>
                </td>
                <td>
                  <p class="font-medium">{{ sale.buyerName }}</p>
                  <p class="text-xs text-base-content/60">{{ sale.buyerPhone }}</p>
                </td>
                <td>
                  <span class="badge badge-sm badge-outline">{{ sale.paymentMethod }}</span>
                </td>
                <td class="text-right font-mono">
                  {{ formatCurrency(sale.sellingPrice, sale.currency) }}
                </td>
                <td :class="['text-right font-mono font-bold', sale.profit >= 0 ? 'text-success' : 'text-error']">
                  {{ formatCurrency(sale.profit, sale.currency) }}
                </td>
                <td class="text-right">
                  <span :class="['badge badge-sm', sale.profitMargin >= 10 ? 'badge-success' : 'badge-warning']">
                    {{ sale.profitMargin?.toFixed(1) }}%
                  </span>
                </td>
                <td class="text-center">
                  <NuxtLink :to="`/sales/receipt/${sale.id}`" class="btn btn-sm btn-ghost btn-square" target="_blank" title="Cetak Kwitansi">
                    <IconPrinter class="w-4 h-4" />
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Product Sales Table -->
    <div v-else-if="activeTab === 'product' && productSales.length" class="card bg-base-200 border border-base-300">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr class="bg-base-200/50">
                <th>Tanggal</th>
                <th>Invoice</th>
                <th>Pembeli</th>
                <th>Product</th>
                <th>Bayar</th>
                <th class="text-right">Harga Jual</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sale in productSales" :key="sale.id" class="hover border-b border-base-200/50 last:border-0">
                <td class="whitespace-nowrap">{{ new Date(sale.saleDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <span class="font-mono text-sm font-medium">{{ sale.invoiceNumber || '-' }}</span>
                </td>
                <td>
                  <p class="font-medium">{{ sale.buyerName }}</p>
                  <p class="text-xs text-base-content/60">{{ sale.buyerPhone || '-' }}</p>
                </td>
                <td>
                  <NuxtLink :to="`/products/${sale.productId}`" class="link link-primary no-underline hover:underline font-medium">
                    {{ sale.product?.name }}
                  </NuxtLink>
                  <p class="text-xs text-base-content/60">{{ sale.product?.category }}</p>
                </td>
                <td>
                  <span class="badge badge-sm badge-outline">{{ sale.paymentMethod }}</span>
                </td>
                <td class="text-right font-mono">
                  {{ formatCurrency(sale.sellingPriceIdr || sale.sellingPrice, 'IDR') }}
                </td>
                <td :class="['text-right font-mono font-bold', sale.profit >= 0 ? 'text-success' : 'text-error']">
                  {{ formatCurrency(sale.profit, 'IDR') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sparepart Sales Table -->
    <div v-else-if="activeTab === 'sparepart'" class="card bg-base-200 border border-base-300">
      <div class="card-body p-0">
        <div v-if="sparepartPending" class="flex items-center justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
        <div v-else-if="sparepartSales.length" class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr class="bg-base-200/50">
                <th>Tanggal</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Bayar</th>
                <th class="text-right">Total</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sale in sparepartSales" :key="sale.id" class="hover border-b border-base-200/50 last:border-0">
                <td class="whitespace-nowrap">{{ new Date(sale.saleDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <span class="font-mono text-sm font-medium">{{ sale.invoiceNumber }}</span>
                </td>
                <td>
                  <p class="font-medium">{{ sale.customerName || '-' }}</p>
                  <p class="text-xs text-base-content/60">{{ sale.customerPhone || '-' }}</p>
                </td>
                <td>
                  <span class="badge badge-sm badge-info">{{ sale.items?.length || 0 }} item</span>
                </td>
                <td>
                  <span class="badge badge-sm badge-outline">{{ sale.paymentMethod }}</span>
                </td>
                <td class="text-right font-mono font-bold text-success">
                  {{ formatCurrency(sale.total, 'IDR') }}
                </td>
                <td class="text-center">
                  <div class="flex justify-center gap-1">
                    <button @click="openPrintModal(sale.id, sale.invoiceNumber)" class="btn btn-sm btn-ghost btn-square" title="Print">
                      <IconPrinter class="w-4 h-4" />
                    </button>
                    <button @click="openDeleteModal(sale.id, sale.invoiceNumber)" class="btn btn-sm btn-ghost btn-square text-error" title="Hapus" :disabled="deleteInProgress">
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-12 text-center text-base-content/60">
          <IconPackage class="w-16 h-16 mx-auto opacity-20 mb-4" />
          <p>Belum ada transaksi service & sparepart</p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-200 border border-base-300">
      <div class="card-body items-center text-center py-12">
        <IconSearch v-if="startDate || endDate" class="w-16 h-16 text-base-content/20" :stroke-width="1" />
        <IconCash v-else class="w-16 h-16 text-base-content/20" :stroke-width="1" />
        
        <h3 class="text-xl font-bold mt-4">
          {{ (startDate || endDate) ? 'Tidak Ditemukan' : 'Belum Ada Penjualan' }}
        </h3>
        <p class="text-base-content/60 max-w-sm">
          {{ 
            (startDate || endDate) 
              ? 'Tidak ada transaksi yang sesuai dengan filter tanggal yang dipilih.' 
              : `Belum ada transaksi penjualan ${activeTab === 'motorcycle' ? 'motor' : 'product'} tercatat.` 
          }}
        </p>
        
        <div class="flex gap-2 mt-4">
          <button v-if="startDate || endDate" @click="startDate = ''; endDate = ''" class="btn btn-outline">
            Reset Filter
          </button>
          <NuxtLink 
            :to="activeTab === 'motorcycle' ? '/motorcycles?status=AVAILABLE' : '/products'" 
            class="btn btn-primary"
          >
            {{ activeTab === 'motorcycle' ? 'Lihat Motor Tersedia' : 'Lihat Product' }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div v-if="data?.meta && data.meta.totalPages > 1" class="flex justify-center mt-6">
      <div class="join">
        <button 
          class="join-item btn" 
          :class="{ 'btn-disabled': page === 1 }"
          @click="page--"
        >
          <IconChevronLeft class="w-4 h-4" />
        </button>
        <button class="join-item btn pointer-events-none">
          Halaman {{ page }} dari {{ data.meta.totalPages }}
        </button>
        <button 
          class="join-item btn" 
          :class="{ 'btn-disabled': page >= data.meta.totalPages }"
          @click="page++"
        >
          <IconChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Print Modal for Sparepart Sales -->
    <dialog :class="['modal', showPrintModal && 'modal-open']">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-2">Cetak Dokumen</h3>
        <p class="text-sm text-base-content/60 mb-4">Invoice: {{ selectedInvoiceNumber }}</p>
        <div class="flex flex-col gap-3">
          <NuxtLink 
            :to="`/sales/sparepart-receipt/${selectedSaleId}`" 
            class="btn btn-secondary gap-2"
            target="_blank"
            @click="showPrintModal = false"
          >
            <IconDownload class="w-5 h-5" />
            E-Receipt (Struk)
          </NuxtLink>
          <NuxtLink 
            :to="`/sales/sparepart-invoice/${selectedSaleId}`" 
            class="btn btn-accent gap-2"
            target="_blank"
            @click="showPrintModal = false"
          >
            <IconReceipt class="w-5 h-5" />
            Invoice (A4)
          </NuxtLink>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showPrintModal = false">Batal</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showPrintModal = false"></form>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog :class="['modal', showDeleteModal && 'modal-open']">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error mb-4">Hapus Transaksi</h3>
        <p class="mb-2">Yakin ingin menghapus transaksi <strong>{{ deleteTargetInvoice }}</strong>?</p>
        <div class="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
          <p class="text-sm text-warning-content">
            ⚠️ Stok sparepart akan dikembalikan dan data akan dihapus dari laporan keuangan.
          </p>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showDeleteModal = false" :disabled="deleteInProgress">Batal</button>
          <button class="btn btn-error" @click="confirmDelete" :disabled="deleteInProgress">
            <span v-if="deleteInProgress" class="loading loading-spinner loading-sm"></span>
            <span v-else>Hapus</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showDeleteModal = false"></form>
    </dialog>
  </div>
</template>

