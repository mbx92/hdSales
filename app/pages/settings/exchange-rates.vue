<script setup lang="ts">
import { IconPlus, IconInfoCircle, IconRefresh } from '@tabler/icons-vue'

// Type untuk response API
interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: string
  createdAt: string
  updatedAt: string
}

interface FetchRateResponse {
  success: boolean
  rate: number
  lastUpdate?: string
  source: string
  error?: string
}

const { data: rates, pending, refresh } = await useFetch<ExchangeRate[]>('/api/exchange-rates')
const { data: latestRate, refresh: refreshLatest } = await useFetch<ExchangeRate>('/api/exchange-rates/latest')
const { showError, showWarning, showSuccess } = useAlert()

const showModal = ref(false)
const loading = ref(false)
const fetchingRate = ref(false)
const apiSource = ref('')
const apiLastUpdate = ref('')

const form = ref({
  fromCurrency: 'USD',
  toCurrency: 'IDR',
  rate: '',
})

// Fetch latest rate from external API when modal opens
const openModal = async () => {
  showModal.value = true
  await fetchLatestRate()
}

const fetchLatestRate = async () => {
  fetchingRate.value = true
  try {
    const response = await $fetch<FetchRateResponse>('/api/exchange-rates/fetch-latest')
    
    if (response.success) {
      form.value.rate = String(Math.round(response.rate))
      apiSource.value = response.source
      apiLastUpdate.value = response.lastUpdate || ''
    } else {
      // API failed, show warning and use fallback
      showWarning(response.error || 'Gagal mengambil kurs dari API')
      form.value.rate = String(response.rate)
      apiSource.value = response.source
    }
  } catch (e: any) {
    showError('Gagal terhubung ke API kurs')
    form.value.rate = '15500' // Fallback
    apiSource.value = 'Manual Input'
  } finally {
    fetchingRate.value = false
  }
}

const handleSubmit = async () => {
  loading.value = true
  try {
    await $fetch('/api/exchange-rates', {
      method: 'POST',
      body: form.value,
    })
    showModal.value = false
    form.value.rate = ''
    showSuccess('Kurs berhasil diupdate!')
    refresh()
    refreshLatest()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal menyimpan kurs')
  } finally {
    loading.value = false
  }
}

const formatRate = (rate: number) => {
  return new Intl.NumberFormat('id-ID').format(rate)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Pengaturan Kurs</h1>
        <p class="text-base-content/60">Kelola kurs mata uang untuk konversi</p>
      </div>
      <button @click="openModal" class="btn btn-primary">
        <IconPlus class="w-5 h-5 mr-2" :stroke-width="1.5" />
        Update Kurs
      </button>
    </div>

    <!-- Current Rate Card -->
    <div class="card bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-medium text-base-content/60">Kurs Saat Ini</h2>
            <p class="text-4xl font-bold mt-2">
              1 USD = <span class="text-primary">Rp {{ formatRate(latestRate?.rate || 15500) }}</span>
            </p>
            <p v-if="latestRate?.effectiveDate" class="text-sm text-base-content/60 mt-2">
              Berlaku sejak: {{ new Date(latestRate.effectiveDate).toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) }}
            </p>
          </div>
          <div class="text-6xl opacity-20">💱</div>
        </div>
      </div>
    </div>

    <!-- Rate History -->
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-lg">Riwayat Kurs</h2>

        <div v-if="pending" class="flex items-center justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="rates?.length" class="overflow-x-auto mt-4">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal Efektif</th>
                <th>Dari</th>
                <th>Ke</th>
                <th class="text-right">Kurs</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rate, index) in rates" :key="rate.id" :class="index === 0 && 'bg-primary/10'">
                <td>
                  {{ new Date(rate.effectiveDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) }}
                  <span v-if="index === 0" class="badge badge-primary badge-sm ml-2">Aktif</span>
                </td>
                <td>
                  <span class="badge">{{ rate.fromCurrency }}</span>
                </td>
                <td>
                  <span class="badge">{{ rate.toCurrency }}</span>
                </td>
                <td class="text-right font-mono font-bold text-primary">
                  {{ formatRate(rate.rate) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center py-8 text-base-content/40">
          Belum ada riwayat kurs
        </div>
      </div>
    </div>

    <!-- Add Rate Modal -->
    <Teleport to="body">
    <dialog :class="['modal', showModal && 'modal-open']">
      <div class="modal-box bg-base-200">
        <h3 class="font-bold text-lg mb-4">Update Kurs</h3>
        
        <!-- Loading state when fetching from API -->
        <div v-if="fetchingRate" class="flex flex-col items-center py-8">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="mt-4 text-base-content/60">Mengambil kurs terbaru dari API...</p>
        </div>
        
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Dari</span></label>
              <select v-model="form.fromCurrency" class="select select-bordered bg-base-300">
                <option value="USD">USD</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Ke</span></label>
              <select v-model="form.toCurrency" class="select select-bordered bg-base-300">
                <option value="IDR">IDR</option>
              </select>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Kurs Baru *</span>
              <button type="button" @click="fetchLatestRate" class="btn btn-ghost btn-xs gap-1">
                <IconRefresh class="w-4 h-4" />
                Refresh
              </button>
            </label>
            <input
              v-model="form.rate"
              type="number"
              step="0.01"
              placeholder="15500"
              class="input input-bordered bg-base-300 text-xl font-bold"
              required
            />
            <label class="label">
              <span class="label-text-alt">1 USD = {{ formatRate(Number(form.rate) || 0) }} IDR</span>
              <span v-if="apiSource" class="label-text-alt text-success">{{ apiSource }}</span>
            </label>
          </div>

          <div class="alert alert-info">
            <IconInfoCircle class="w-6 h-6 shrink-0" :stroke-width="1.5" />
            <div>
              <p>Kurs baru akan berlaku untuk transaksi setelah ini.</p>
              <p v-if="apiLastUpdate" class="text-xs opacity-70 mt-1">API update: {{ apiLastUpdate }}</p>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="showModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Simpan
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showModal = false">close</button>
      </form>
    </dialog>
    </Teleport>
  </div>
</template>
