<script setup lang="ts">
const { data: rates, pending, refresh } = await useFetch('/api/exchange-rates')
const { data: latestRate } = await useFetch('/api/exchange-rates/latest')

const showModal = ref(false)
const loading = ref(false)

const form = ref({
  fromCurrency: 'USD',
  toCurrency: 'IDR',
  rate: '',
})

const handleSubmit = async () => {
  loading.value = true
  try {
    await $fetch('/api/exchange-rates', {
      method: 'POST',
      body: form.value,
    })
    showModal.value = false
    form.value.rate = ''
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menyimpan kurs')
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
      <button @click="showModal = true" class="btn btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
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
    <dialog :class="['modal', showModal && 'modal-open']">
      <div class="modal-box bg-base-200">
        <h3 class="font-bold text-lg mb-4">Update Kurs</h3>
        <form @submit.prevent="handleSubmit" class="space-y-4">
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
            <label class="label"><span class="label-text">Kurs Baru *</span></label>
            <input
              v-model="form.rate"
              type="number"
              step="0.01"
              placeholder="15500"
              class="input input-bordered bg-base-300"
              required
            />
            <label class="label">
              <span class="label-text-alt">Contoh: 1 USD = 15500 IDR</span>
            </label>
          </div>

          <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Kurs baru akan berlaku untuk transaksi setelah ini.</span>
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
  </div>
</template>
