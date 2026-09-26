<script setup lang="ts">
import { IconPlus, IconSearch, IconBox, IconReceipt, IconLayoutGrid, IconList } from '@tabler/icons-vue'

const status = ref('')
const category = ref('')
const search = ref('')
const viewMode = useCookie<'grid' | 'list'>('products-view-mode', {
  default: () => 'grid',
  sameSite: 'lax',
})

const { data, pending, refresh } = await useFetch('/api/products', {
  query: {
    status,
    category,
    search,
  },
  watch: [status, category, search],
})

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'AVAILABLE', label: 'Tersedia' },
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'INACTIVE', label: 'Nonaktif' },
  { value: 'SOLD', label: 'Terjual' },
]

const categoryOptions = [
  { value: '', label: 'Semua Kategori' },
  { value: 'SPAREPART', label: 'Sparepart' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'APPAREL', label: 'Apparel' },
  { value: 'CUSTOM', label: 'Custom' },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'badge-success'
    case 'ON_PROGRESS': return 'badge-warning'
    case 'SOLD': return 'badge-info'
    default: return 'badge-ghost'
  }
}

const getCategoryBadge = (category: string) => {
  switch (category) {
    case 'SPAREPART': return 'badge-primary'
    case 'ACCESSORIES': return 'badge-secondary'
    case 'APPAREL': return 'badge-accent'
    case 'CUSTOM': return 'badge-neutral'
    default: return 'badge-ghost'
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

const { showError } = useAlert()

const toggleStatus = async (productId: string, event: Event) => {
  event.preventDefault()
  event.stopPropagation()
  try {
    await $fetch(`/api/products/${productId}/toggle-status`, { method: 'PATCH' })
    refresh()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal mengubah status')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Daftar Product</h1>
        <p class="text-base-content/60">Kelola inventori product Anda</p>
      </div>
      <NuxtLink to="/products/new" class="btn btn-primary">
        <IconPlus class="w-5 h-5 mr-2" :stroke-width="1.5" />
        Tambah Product
      </NuxtLink>
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
                placeholder="Cari nama, SKU, atau supplier..."
                class="input input-bordered w-full bg-base-300 pr-10"
              />
              <IconSearch class="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" :stroke-width="1.5" />
            </div>
          </div>
          <select v-model="category" class="select select-bordered bg-base-300 w-full md:w-48">
            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <select v-model="status" class="select select-bordered bg-base-300 w-full md:w-48">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <div class="join self-stretch md:self-auto" role="group" aria-label="Pilih tampilan produk">
            <button
              type="button"
              :class="['join-item btn flex-1 md:flex-none', viewMode === 'grid' ? 'btn-primary' : 'btn-ghost bg-base-300']"
              :aria-pressed="viewMode === 'grid'"
              title="Tampilan grid"
              @click="viewMode = 'grid'"
            >
              <IconLayoutGrid class="w-5 h-5" :stroke-width="1.5" />
              <span class="md:hidden lg:inline">Grid</span>
            </button>
            <button
              type="button"
              :class="['join-item btn flex-1 md:flex-none', viewMode === 'list' ? 'btn-primary' : 'btn-ghost bg-base-300']"
              :aria-pressed="viewMode === 'list'"
              title="Tampilan list"
              @click="viewMode = 'list'"
            >
              <IconList class="w-5 h-5" :stroke-width="1.5" />
              <span class="md:hidden lg:inline">List</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Products -->
    <div
      v-else-if="data?.length"
      :class="[
        'grid gap-6',
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1',
      ]"
    >
      <div
        v-for="product in data"
        :key="product.id"
        :class="[
          'card bg-base-200 border border-base-300 overflow-hidden',
          viewMode === 'list' ? 'md:card-side' : '',
        ]"
      >
        <NuxtLink
          :to="`/products/${product.id}`"
          :class="viewMode === 'list' ? 'md:w-44 md:shrink-0' : ''"
        >
          <figure :class="viewMode === 'grid' ? 'px-4 pt-4' : 'px-4 pt-4 md:p-4 md:pr-0 md:h-full'">
            <div :class="[
              'w-full bg-base-300 rounded-xl flex items-center justify-center',
              viewMode === 'grid' ? 'h-48' : 'h-32 md:h-full md:min-h-36',
            ]">
              <IconBox :class="viewMode === 'grid' ? 'w-24 h-24 text-base-content/20' : 'w-16 h-16 text-base-content/20'" :stroke-width="1" />
            </div>
          </figure>
        </NuxtLink>
        <div :class="['card-body', viewMode === 'list' ? 'md:flex-row md:items-center md:gap-6' : '']">
          <NuxtLink
            :to="`/products/${product.id}`"
            :class="viewMode === 'list' ? 'md:flex-1 md:min-w-0' : ''"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <h2 class="card-title text-lg line-clamp-1">{{ product.name }}</h2>
                <p class="text-sm text-base-content/60">{{ product.sku || 'No SKU' }}</p>
              </div>
              <div class="flex flex-col gap-1 items-end">
                <div :class="['badge badge-sm', getCategoryBadge(product.category)]">
                  {{ product.customCategory || product.category }}
                </div>
                <div :class="['badge badge-sm', getStatusBadge(product.status)]">
                  {{ product.status }}
                </div>
                <label v-if="product.status !== 'SOLD'" class="swap swap-rotate ml-2" @click.prevent.stop>
                  <input 
                    type="checkbox" 
                    :checked="product.status === 'AVAILABLE'"
                    @change="(e) => toggleStatus(product.id, e)"
                  />
                  <span class="swap-on text-success text-xs">ON</span>
                  <span class="swap-off text-error text-xs">OFF</span>
                </label>
              </div>
            </div>

            <div :class="['grid gap-2 mt-3 text-sm', viewMode === 'list' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2']">
              <div>
                <span class="text-base-content/60">Supplier</span>
                <p class="truncate">{{ product.supplier || '-' }}</p>
              </div>
              <div>
                <span class="text-base-content/60">Biaya</span>
                <p class="font-mono text-xs">{{ product.costs?.length || 0 }} item</p>
              </div>
            </div>

            <div class="divider my-2"></div>

            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs text-base-content/60">HPP</span>
                <p class="font-bold text-primary text-sm">
                  {{ formatCurrency(product.totalCost, product.currency) }}
                </p>
              </div>
              <div v-if="product.sellingPrice" class="text-right">
                <span class="text-xs text-base-content/60">Harga Jual</span>
                <p class="font-bold text-success text-sm">
                  {{ formatCurrency(product.sellingPrice, product.currency) }}
                </p>
              </div>
            </div>
          </NuxtLink>

          <!-- Receipt Button for Sold Products -->
          <div
            v-if="product.status === 'SOLD' && product.saleTransaction"
            :class="viewMode === 'list' ? 'mt-3 pt-3 border-t border-base-300 md:mt-0 md:pt-0 md:pl-6 md:border-t-0 md:border-l md:shrink-0' : 'mt-3 pt-3 border-t border-base-300'"
          >
            <NuxtLink
              :to="`/sales/product-receipt/${product.saleTransaction.id}`"
              class="btn btn-primary btn-sm btn-block gap-1"
              @click.stop
            >
              <IconReceipt class="w-4 h-4" :stroke-width="1.5" />
              Cetak Kwitansi
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-200 border border-base-300">
      <div class="card-body items-center text-center py-12">
        <IconBox class="w-16 h-16 text-base-content/20" :stroke-width="1" />
        <h3 class="text-xl font-bold mt-4">Belum Ada Product</h3>
        <p class="text-base-content/60">Mulai tambahkan product pertama Anda</p>
        <NuxtLink to="/products/new" class="btn btn-primary mt-4">
          Tambah Product
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
