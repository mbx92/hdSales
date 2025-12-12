<script setup lang="ts">
import { IconPlus, IconSearch, IconMotorbike } from '@tabler/icons-vue'

const route = useRoute()

const status = ref(route.query.status as string || '')
const search = ref('')
const page = ref(1)

const { data, pending, refresh } = await useFetch('/api/motorcycles', {
  query: {
    status,
    search,
    page,
    limit: 12,
  },
  watch: [status, search, page],
})

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'INSPECTION', label: 'Inspeksi' },
  { value: 'AVAILABLE', label: 'Tersedia' },
  { value: 'SOLD', label: 'Terjual' },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'INSPECTION': return 'badge-warning'
    case 'AVAILABLE': return 'badge-success'
    case 'SOLD': return 'badge-info'
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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Daftar Motor</h1>
        <p class="text-base-content/60">Kelola inventori motor Anda</p>
      </div>
      <NuxtLink to="/motorcycles/create" class="btn btn-primary">
        <IconPlus class="w-5 h-5 mr-2" :stroke-width="1.5" />
        Tambah Motor
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
                placeholder="Cari VIN, model, atau owner..."
                class="input input-bordered w-full bg-base-300 pr-10"
              />
              <IconSearch class="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" :stroke-width="1.5" />
            </div>
          </div>
          <select v-model="status" class="select select-bordered bg-base-300 w-full md:w-48">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Motorcycles Grid -->
    <div v-else-if="data?.data?.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="motorcycle in data.data"
        :key="motorcycle.id"
        :to="`/motorcycles/${motorcycle.id}`"
        class="card bg-base-200 border border-base-300 card-hover"
      >
        <figure class="px-4 pt-4">
          <div class="w-full h-48 bg-base-300 rounded-xl flex items-center justify-center">
            <IconMotorbike class="w-24 h-24 text-base-content/20" :stroke-width="1" />
          </div>
        </figure>
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="card-title text-lg">{{ motorcycle.model }}</h2>
              <p class="text-sm text-base-content/60">{{ motorcycle.brand }} • {{ motorcycle.year }}</p>
            </div>
            <div :class="['badge', getStatusBadge(motorcycle.status)]">
              {{ motorcycle.status }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div>
              <span class="text-base-content/60">VIN</span>
              <p class="font-mono text-xs">{{ motorcycle.vin.slice(-8) }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Warna</span>
              <p>{{ motorcycle.color || '-' }}</p>
            </div>
            <div>
              <span class="text-base-content/60">KM</span>
              <p>{{ motorcycle.mileage?.toLocaleString() || '-' }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Biaya</span>
              <p class="font-mono text-xs">{{ motorcycle._count?.costs || 0 }} item</p>
            </div>
          </div>

          <div class="divider my-2"></div>

          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs text-base-content/60">HPP</span>
              <p class="font-bold text-primary">
                {{ formatCurrency(motorcycle.totalCost, motorcycle.currency) }}
              </p>
            </div>
            <div v-if="motorcycle.sellingPrice" class="text-right">
              <span class="text-xs text-base-content/60">Harga Jual</span>
              <p class="font-bold text-success">
                {{ formatCurrency(motorcycle.sellingPrice, motorcycle.currency) }}
              </p>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-200 border border-base-300">
      <div class="card-body items-center text-center py-12">
        <IconMotorbike class="w-16 h-16 text-base-content/20" :stroke-width="1" />
        <h3 class="text-xl font-bold mt-4">Belum Ada Motor</h3>
        <p class="text-base-content/60">Mulai tambahkan motor pertama Anda</p>
        <NuxtLink to="/motorcycles/create" class="btn btn-primary mt-4">
          Tambah Motor
        </NuxtLink>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="data?.meta?.totalPages && data.meta.totalPages > 1" class="flex justify-center">
      <div class="join">
        <button
          class="join-item btn"
          :disabled="page <= 1"
          @click="page--"
        >
          «
        </button>
        <button class="join-item btn">
          Halaman {{ page }} dari {{ data?.meta?.totalPages }}
        </button>
        <button
          class="join-item btn"
          :disabled="page >= (data?.meta?.totalPages || 1)"
          @click="page++"
        >
          »
        </button>
      </div>
    </div>
  </div>
</template>
