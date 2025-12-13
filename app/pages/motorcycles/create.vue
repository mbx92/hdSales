<script setup lang="ts">
import { IconArrowLeft, IconMotorbike, IconUser, IconNotes, IconAlertCircle } from '@tabler/icons-vue'

const router = useRouter()

const form = ref({
  vin: '',
  brand: 'Harley Davidson',
  model: '',
  customModel: '', // NEW: for custom model
  year: new Date().getFullYear(),
  color: '',
  mileage: null as number | null,
  condition: 'USED',
  currency: 'IDR',
  status: 'AVAILABLE', // Changed default from INSPECTION
  notes: '',
})

const loading = ref(false)
const error = ref('')

const models = [
  'Street 750',
  'Street 500',
  'Iron 883',
  'Forty-Eight',
  'Street Bob',
  'Fat Bob',
  'Low Rider',
  'Heritage Classic',
  'Road King',
  'Street Glide',
  'Road Glide',
  'Electra Glide',
  'Fat Boy',
  'Breakout',
  'Softail Standard',
  'Sport Glide',
  'Pan America',
  'Sportster S',
  'Nightster',
  'Custom', // NEW: Custom option
]

const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    const motorcycle = await $fetch('/api/motorcycles', {
      method: 'POST',
      body: form.value,
    })

    router.push(`/motorcycles/${motorcycle.id}`)
  } catch (e: any) {
    error.value = e.data?.message || 'Gagal menyimpan motor'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <NuxtLink to="/motorcycles" class="btn btn-ghost btn-square">
        <IconArrowLeft class="w-6 h-6" :stroke-width="1.5" />
      </NuxtLink>
      <div>
        <h1 class="text-3xl font-bold">Tambah Motor Baru</h1>
        <p class="text-base-content/60">Catat motor baru untuk inspeksi atau pembelian</p>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="alert alert-error">
      <IconAlertCircle class="w-6 h-6 shrink-0" :stroke-width="1.5" />
      <span>{{ error }}</span>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Vehicle Info -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg mb-4">
            <IconMotorbike class="w-5 h-5" :stroke-width="1.5" />
            Informasi Motor
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text font-medium">VIN (Vehicle Identification Number) *</span>
              </label>
              <input
                v-model="form.vin"
                type="text"
                placeholder="1HD1KB4147Y123456"
                class="input input-bordered bg-base-300 font-mono uppercase"
                maxlength="17"
                required
              />
              <label class="label">
                <span class="label-text-alt">17 karakter unik untuk setiap motor</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Brand</span>
              </label>
              <input
                v-model="form.brand"
                type="text"
                class="input input-bordered bg-base-300"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Model *</span>
              </label>
              <select v-model="form.model" class="select select-bordered bg-base-300" required>
                <option value="" disabled>Pilih model</option>
                <option v-for="model in models" :key="model" :value="model">
                  {{ model }}
                </option>
              </select>
            </div>

            <!-- Custom Model Field (conditional) -->
            <div v-if="form.model === 'Custom'" class="form-control">
              <label class="label">
                <span class="label-text font-medium">Nama Model Custom *</span>
              </label>
              <input
                v-model="form.customModel"
                type="text"
                placeholder="Masukkan nama model"
                class="input input-bordered bg-base-300"
                :required="form.model === 'Custom'"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tahun *</span>
              </label>
              <select v-model="form.year" class="select select-bordered bg-base-300" required>
                <option v-for="year in years" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Warna</span>
              </label>
              <input
                v-model="form.color"
                type="text"
                placeholder="Vivid Black"
                class="input input-bordered bg-base-300"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kilometer</span>
              </label>
              <input
                v-model="form.mileage"
                type="number"
                placeholder="12500"
                class="input input-bordered bg-base-300"
                min="0"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kondisi</span>
              </label>
              <select v-model="form.condition" class="select select-bordered bg-base-300">
                <option value="USED">Bekas</option>
                <option value="NEW">Baru</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Currency *</span>
              </label>
              <select v-model="form.currency" class="select select-bordered bg-base-300" required disabled>
                <option value="IDR">IDR (Rupiah)</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Status</span>
              </label>
              <select v-model="form.status" class="select select-bordered bg-base-300">
                <option value="AVAILABLE">Tersedia</option>
                <option value="ON_PROGRESS">On Progress</option>
              </select>
            </div>
          </div>
        </div>
      </div>


      <!-- Notes -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg mb-4">
            <IconNotes class="w-5 h-5" :stroke-width="1.5" />
            Catatan
          </h2>
          
          <textarea
            v-model="form.notes"
            class="textarea textarea-bordered bg-base-300 h-32"
            placeholder="Catatan tambahan tentang motor ini..."
          ></textarea>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-4">
        <NuxtLink to="/motorcycles" class="btn btn-ghost">
          Batal
        </NuxtLink>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>Simpan Motor</span>
        </button>
      </div>
    </form>
  </div>
</template>
