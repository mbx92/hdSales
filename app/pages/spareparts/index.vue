<script setup lang="ts">
import { IconSearch, IconPlus, IconFilter, IconAlertTriangle, IconPackage, IconTag, IconAdjustments, IconInfinity } from '@tabler/icons-vue'

interface Sparepart {
  id: string
  sku: string
  name: string
  category: string
  brand?: string
  stock: number
  minStock: number
  sellingPrice: number
  purchasePrice: number
  currency: string
  status: string
  supplier?: { name: string }
}

const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const category = ref('ALL')
const status = ref('ALL')
const { showSuccess, showError } = useAlert()

const { data: spareparts, pending, refresh } = await useFetch<Sparepart[]>('/api/spareparts', {
  query: { 
    search: debouncedSearch,
    category,
    status
  },
  watch: [debouncedSearch, category, status]
})

// Stock adjustment modal
const showAdjustModal = ref(false)
const adjustItem = ref<Sparepart | null>(null)
const adjustForm = ref({
  quantity: 0,
  type: 'PURCHASE',
  reason: ''
})
const adjusting = ref(false)

const openAdjustModal = (item: Sparepart) => {
  adjustItem.value = item
  adjustForm.value = { quantity: 0, type: 'PURCHASE', reason: '' }
  showAdjustModal.value = true
}

const submitAdjustment = async () => {
  if (!adjustItem.value || adjustForm.value.quantity === 0) return
  adjusting.value = true
  try {
    await $fetch(`/api/spareparts/${adjustItem.value.id}/stock-adjustment`, {
      method: 'POST',
      body: adjustForm.value
    })
    showSuccess('Stok berhasil disesuaikan')
    showAdjustModal.value = false
    refresh()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal menyesuaikan stok')
  } finally {
    adjusting.value = false
  }
}

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

const getCategoryBadge = (cat: string) => {
  switch (cat) {
    case 'SERVICE': return 'badge-info'
    case 'SPAREPART': return 'badge-primary'
    case 'ACCESSORY': return 'badge-secondary'
    case 'APPAREL': return 'badge-accent'
    default: return 'badge-ghost'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <IconPackage class="w-8 h-8 text-primary" :stroke-width="1.5" />
          Services & Spareparts
        </h1>
        <p class="text-base-content/60">Manajemen services, sparepart, dan accessories</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/spareparts/sell" class="btn btn-secondary">
          <IconTag class="w-5 h-5 mr-1" :stroke-width="1.5" />
          Kasir / POS
        </NuxtLink>
        <NuxtLink to="/spareparts/create" class="btn btn-primary">
          <IconPlus class="w-5 h-5 mr-1" :stroke-width="1.5" />
          Tambah Produk
        </NuxtLink>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body py-4">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="form-control flex-1">
            <div class="relative">
              <input
                v-model="search"
                type="text"
                placeholder="Cari SKU, nama, atau brand..."
                class="input input-bordered w-full bg-base-300 pr-10"
              />
              <IconSearch class="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" :stroke-width="1.5" />
            </div>
          </div>
          <select v-model="category" class="select select-bordered bg-base-300 w-full md:w-48">
            <option value="ALL">Semua Kategori</option>
            <option value="SERVICE">Service</option>
            <option value="SPAREPART">Sparepart</option>
            <option value="ACCESSORY">Accessory</option>
            <option value="APPAREL">Apparel</option>
            <option value="OTHER">Lainnya</option>
          </select>
          <select v-model="status" class="select select-bordered bg-base-300 w-full md:w-40">
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DISCONTINUED">Discontinued</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Products Table -->
    <div v-else-if="spareparts?.length" class="card bg-base-200 border border-base-300">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th class="text-right">Harga Jual</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in spareparts" :key="item.id" class="hover">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-base-300 text-base-content rounded w-12 h-12">
                        <span class="text-xs font-bold">{{ item.sku.slice(-2) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-bold">{{ item.name }}</div>
                      <div class="text-xs opacity-50">{{ item.sku }} • {{ item.brand || 'No Brand' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['badge badge-sm', getCategoryBadge(item.category)]">{{ item.category }}</span>
                </td>
                <td>
                  <div v-if="item.category === 'SERVICE'" class="flex items-center gap-1">
                    <IconInfinity class="w-4 h-4 text-info" :stroke-width="1.5" />
                    <span class="text-xs text-base-content/60">Unlimited</span>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <span :class="{'text-error font-bold': item.stock <= item.minStock}">{{ item.stock }}</span>
                    <IconAlertTriangle 
                      v-if="item.stock <= item.minStock" 
                      class="w-4 h-4 text-warning" 
                      title="Stok menipis"
                    />
                  </div>
                </td>
                <td class="text-right font-mono">
                  {{ formatCurrency(item.sellingPrice, item.currency) }}
                </td>
                <td>
                  <div :class="['badge badge-xs', item.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']"></div>
                  <span class="ml-2 text-xs">{{ item.status }}</span>
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <button
                      v-if="item.category !== 'SERVICE'"
                      @click="openAdjustModal(item)"
                      class="btn btn-ghost btn-xs"
                      title="Adjust Stock"
                    >
                      <IconAdjustments class="w-4 h-4" :stroke-width="1.5" />
                    </button>
                    <NuxtLink :to="`/spareparts/${item.id}`" class="btn btn-ghost btn-xs">
                      Detail
                    </NuxtLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16 text-base-content/60">
      <IconPackage class="w-16 h-16 mx-auto opacity-20 mb-4" :stroke-width="1" />
      <h3 class="text-lg font-bold">Tidak ada produk ditemukan</h3>
      <p>Coba gunakan kata kunci lain atau tambahkan produk baru</p>
    </div>

    <!-- Stock Adjustment Modal -->
    <dialog :class="['modal', { 'modal-open': showAdjustModal }]">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Penyesuaian Stok</h3>
        <div v-if="adjustItem" class="space-y-4">
          <div class="bg-base-200 rounded-lg p-3">
            <p class="font-medium">{{ adjustItem.name }}</p>
            <p class="text-sm text-base-content/60">SKU: {{ adjustItem.sku }} | Stok saat ini: {{ adjustItem.stock }}</p>
          </div>
          
          <div class="form-control">
            <label class="label"><span class="label-text">Tipe Penyesuaian</span></label>
            <select v-model="adjustForm.type" class="select select-bordered bg-base-300">
              <option value="PURCHASE">Pembelian (+)</option>
              <option value="RETURN">Return (+)</option>
              <option value="ADJUSTMENT">Penyesuaian (-)</option>
              <option value="LOSS">Kehilangan (-)</option>
            </select>
          </div>
          
          <div class="form-control">
            <label class="label"><span class="label-text">Jumlah</span></label>
            <input
              v-model.number="adjustForm.quantity"
              type="number"
              class="input input-bordered bg-base-300"
              :placeholder="adjustForm.type === 'PURCHASE' || adjustForm.type === 'RETURN' ? 'Masukkan jumlah (+)' : 'Masukkan jumlah (-)'"
            />
            <label class="label" v-if="adjustItem.purchasePrice">
              <span class="label-text-alt">Total: {{ formatCurrency(Math.abs(adjustForm.quantity) * adjustItem.purchasePrice) }}</span>
            </label>
          </div>
          
          <div class="form-control">
            <label class="label"><span class="label-text">Alasan (opsional)</span></label>
            <input v-model="adjustForm.reason" type="text" class="input input-bordered bg-base-300" placeholder="Catatan penyesuaian" />
          </div>
        </div>
        <div class="modal-action">
          <button @click="showAdjustModal = false" class="btn btn-ghost">Batal</button>
          <button @click="submitAdjustment" class="btn btn-primary" :disabled="adjusting || adjustForm.quantity === 0">
            <span v-if="adjusting" class="loading loading-spinner loading-sm"></span>
            Simpan
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showAdjustModal = false"></form>
    </dialog>
  </div>
</template>
