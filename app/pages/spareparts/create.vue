<script setup lang="ts">
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons-vue'

const router = useRouter()

// Fetch suppliers for dropdown
const { data: suppliers } = await useFetch('/api/suppliers')

const loading = ref(false)
const form = ref({
  sku: '',
  name: '',
  brand: '',
  category: 'SPAREPART',
  purchasePrice: '',
  sellingPrice: '',
  currency: 'IDR',
  stock: 0,
  minStock: 1,
  supplierId: '',
  description: '',
  status: 'ACTIVE'
})

const categories = [
  { value: 'SPAREPART', label: 'Sparepart' },
  { value: 'ACCESSORY', label: 'Aksesoris' },
  { value: 'APPAREL', label: 'Apparel / Merchandise' },
  { value: 'OTHER', label: 'Lainnya' },
]

const handleSubmit = async () => {
  loading.value = true
  try {
    await $fetch('/api/spareparts', {
      method: 'POST',
      body: form.value
    })
    router.push('/spareparts')
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menambahkan produk')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <NuxtLink to="/spareparts" class="btn btn-ghost btn-square">
        <IconArrowLeft class="w-6 h-6" :stroke-width="1.5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold">Tambah Produk Baru</h1>
        <p class="text-base-content/60">Input data sparepart atau aksesoris baru</p>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="card bg-base-200 border border-base-300">
      <div class="card-body space-y-6">
        
        <!-- Basic Info -->
        <div>
          <h3 class="font-bold border-b border-base-300 pb-2 mb-4">Informasi Produk</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">SKU (Kode Barang) *</span></label>
              <input v-model="form.sku" type="text" class="input input-bordered bg-base-300" required placeholder="Contoh: SP-001" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Kategori *</span></label>
              <select v-model="form.category" class="select select-bordered bg-base-300">
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>
            <div class="form-control md:col-span-2">
              <label class="label"><span class="label-text">Nama Produk *</span></label>
              <input v-model="form.name" type="text" class="input input-bordered bg-base-300" required placeholder="Nama lengkap sparepart" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Brand / Merk</span></label>
              <input v-model="form.brand" type="text" class="input input-bordered bg-base-300" placeholder="Harley Davidson, Aftermarket, dll" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Supplier</span></label>
              <select v-model="form.supplierId" class="select select-bordered bg-base-300">
                <option value="">-- Pilih Supplier --</option>
                <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
                  {{ sup.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Pricing & Stock -->
        <div>
          <h3 class="font-bold border-b border-base-300 pb-2 mb-4">Harga & Stok</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Mata Uang</span></label>
              <select v-model="form.currency" class="select select-bordered bg-base-300">
                <option value="IDR">IDR (Rupiah)</option>
                <option value="USD">USD (Dollar)</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Harga Beli (HPP)</span></label>
              <input v-model="form.purchasePrice" type="number" class="input input-bordered bg-base-300" required min="0" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Harga Jual</span></label>
              <input v-model="form.sellingPrice" type="number" class="input input-bordered bg-base-300" required min="0" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Stok Awal</span></label>
              <input v-model="form.stock" type="number" class="input input-bordered bg-base-300" required min="0" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Minimum Stok (Alert)</span></label>
              <input v-model="form.minStock" type="number" class="input input-bordered bg-base-300" required min="0" />
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div class="form-control">
          <label class="label"><span class="label-text">Deskripsi / Catatan</span></label>
          <textarea v-model="form.description" class="textarea textarea-bordered bg-base-300 h-24" placeholder="Detail spesifikasi, compatibility, dll"></textarea>
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <NuxtLink to="/spareparts" class="btn btn-ghost">Batal</NuxtLink>
          <button type="submit" class="btn btn-primary px-8" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            Simpan Produk
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
