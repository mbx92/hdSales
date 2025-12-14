<script setup lang="ts">
import { IconArrowLeft, IconBox, IconNotes, IconAlertCircle } from '@tabler/icons-vue'

const router = useRouter()

const form = ref({
  name: '',
  sku: '',
  category: 'SPAREPART',
  customCategory: '',
  description: '',
  currency: 'IDR',
  status: 'ON_PROGRESS',
  supplier: '',
  notes: '',
})

const loading = ref(false)
const error = ref('')

const categories = [
  { value: 'SPAREPART', label: 'Sparepart' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'APPAREL', label: 'Apparel' },
  { value: 'CUSTOM', label: 'Custom' },
]

const statusOptions = [
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'AVAILABLE', label: 'Tersedia' },
]

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    const product = await $fetch('/api/products', {
      method: 'POST',
      body: form.value,
    })

    router.push(`/products/${product.id}`)
  } catch (e: any) {
    error.value = e.data?.message || 'Gagal menyimpan product'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <NuxtLink to="/products" class="btn btn-ghost btn-square">
        <IconArrowLeft class="w-6 h-6" :stroke-width="1.5" />
      </NuxtLink>
      <div>
        <h1 class="text-3xl font-bold">Tambah Product</h1>
        <p class="text-base-content/60">Masukkan informasi product baru</p>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="alert alert-error">
      <IconAlertCircle class="w-6 h-6" :stroke-width="1.5" />
      <span>{{ error }}</span>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Product Info Card -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg mb-4">
            <IconBox class="w-5 h-5" :stroke-width="1.5" />
            Informasi Product
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text font-medium">Nama Product *</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Oil Filter Harley Davidson"
                class="input input-bordered bg-base-300"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">SKU</span>
              </label>
              <input
                v-model="form.sku"
                type="text"
                placeholder="HD-OIL-001"
                class="input input-bordered bg-base-300 font-mono uppercase"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kategori *</span>
              </label>
              <select v-model="form.category" class="select select-bordered bg-base-300" required>
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>

            <!-- Custom Category Field (conditional) -->
            <div v-if="form.category === 'CUSTOM'" class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text font-medium">Nama Kategori Custom *</span>
              </label>
              <input
                v-model="form.customCategory"
                type="text"
                placeholder="Masukkan nama kategori"
                class="input input-bordered bg-base-300"
                :required="form.category === 'CUSTOM'"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Supplier</span>
              </label>
              <input
                v-model="form.supplier"
                type="text"
                placeholder="HD Parts Indonesia"
                class="input input-bordered bg-base-300"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Status</span>
              </label>
              <select v-model="form.status" class="select select-bordered bg-base-300">
                <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text font-medium">Deskripsi</span>
              </label>
              <textarea
                v-model="form.description"
                class="textarea textarea-bordered bg-base-300 h-24"
                placeholder="Deskripsi product..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Card -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg mb-4">
            <IconNotes class="w-5 h-5" :stroke-width="1.5" />
            Catatan
          </h2>
          
          <textarea
            v-model="form.notes"
            class="textarea textarea-bordered bg-base-300 h-32"
            placeholder="Catatan tambahan tentang product ini..."
          ></textarea>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-4">
        <NuxtLink to="/products" class="btn btn-ghost">
          Batal
        </NuxtLink>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          Simpan Product
        </button>
      </div>
    </form>
  </div>
</template>
