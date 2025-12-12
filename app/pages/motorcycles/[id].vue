<script setup lang="ts">
import { IconArrowLeft, IconChevronDown, IconCash, IconTrash, IconPlus, IconInfoCircle } from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { data: motorcycle, pending, refresh } = await useFetch(`/api/motorcycles/${id}`)

const showCostModal = ref(false)
const showSellModal = ref(false)
const loading = ref(false)

const costForm = ref({
  component: 'SERVICE',
  description: '',
  amount: '',
  currency: 'IDR',
  paymentMethod: 'CASH',
  notes: '',
})

const sellForm = ref({
  sellingPrice: '',
  currency: 'IDR',
  buyerName: '',
  buyerPhone: '',
  buyerAddress: '',
  paymentMethod: 'TRANSFER',
  paidAmount: '',
  notes: '',
})

const costComponents = [
  { value: 'INSPECTION', label: 'Inspeksi' },
  { value: 'PURCHASE', label: 'Pembelian' },
  { value: 'TOWING', label: 'Derek / Towing' },
  { value: 'DETAILING', label: 'Detailing' },
  { value: 'SERVICE', label: 'Service / Tune-up' },
  { value: 'IMPORT_FEES', label: 'Biaya Import' },
  { value: 'STORAGE', label: 'Storage / Parkir' },
  { value: 'DOCUMENTATION', label: 'Dokumentasi' },
  { value: 'OTHER', label: 'Lainnya' },
]

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'INSPECTION': return 'badge-warning'
    case 'AVAILABLE': return 'badge-success'
    case 'SOLD': return 'badge-info'
    default: return 'badge-ghost'
  }
}

const addCost = async () => {
  loading.value = true
  try {
    await $fetch(`/api/motorcycles/${id}/costs`, {
      method: 'POST',
      body: {
        ...costForm.value,
        amount: parseFloat(costForm.value.amount),
      },
    })
    showCostModal.value = false
    costForm.value = {
      component: 'SERVICE',
      description: '',
      amount: '',
      currency: 'IDR',
      paymentMethod: 'CASH',
      notes: '',
    }
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menambah biaya')
  } finally {
    loading.value = false
  }
}

const sellMotorcycle = async () => {
  loading.value = true
  try {
    await $fetch(`/api/motorcycles/${id}/sell`, {
      method: 'POST',
      body: {
        ...sellForm.value,
        sellingPrice: parseFloat(sellForm.value.sellingPrice),
        paidAmount: parseFloat(sellForm.value.paidAmount || sellForm.value.sellingPrice),
      },
    })
    showSellModal.value = false
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menjual motor')
  } finally {
    loading.value = false
  }
}

const updateStatus = async (newStatus: string) => {
  loading.value = true
  try {
    await $fetch(`/api/motorcycles/${id}`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Gagal update status')
  } finally {
    loading.value = false
  }
}

const deleteMotorcycle = async () => {
  if (!confirm('Yakin ingin menghapus motor ini? Semua data biaya juga akan terhapus.')) return
  
  loading.value = true
  try {
    await $fetch(`/api/motorcycles/${id}`, { method: 'DELETE' })
    router.push('/motorcycles')
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menghapus motor')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <template v-else-if="motorcycle">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div class="flex items-start gap-4">
          <NuxtLink to="/motorcycles" class="btn btn-ghost btn-square">
            <IconArrowLeft class="w-6 h-6" :stroke-width="1.5" />
          </NuxtLink>
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-bold">{{ motorcycle.model }}</h1>
              <div :class="['badge badge-lg', getStatusBadge(motorcycle.status)]">
                {{ motorcycle.status }}
              </div>
            </div>
            <p class="text-base-content/60">{{ motorcycle.brand }} • {{ motorcycle.year }}</p>
            <p class="font-mono text-sm mt-1">VIN: {{ motorcycle.vin }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <div v-if="motorcycle.status === 'INSPECTION'" class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-outline">
              Update Status
              <IconChevronDown class="w-4 h-4 ml-1" :stroke-width="1.5" />
            </label>
            <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-300 rounded-box w-52 z-10">
              <li><a @click="updateStatus('AVAILABLE')">✓ Tersedia (Deal)</a></li>
            </ul>
          </div>

          <button
            v-if="motorcycle.status === 'AVAILABLE'"
            @click="showSellModal = true"
            class="btn btn-success"
          >
            <IconCash class="w-5 h-5 mr-1" :stroke-width="1.5" />
            Jual Motor
          </button>

          <button
            v-if="motorcycle.status !== 'SOLD'"
            @click="deleteMotorcycle"
            class="btn btn-outline btn-error"
            :disabled="loading"
          >
            <IconTrash class="w-5 h-5" :stroke-width="1.5" />
          </button>
        </div>
      </div>

      <!-- Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Details Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-lg">Detail Motor</h2>
            <div class="space-y-3 mt-2">
              <div class="flex justify-between">
                <span class="text-base-content/60">Warna</span>
                <span>{{ motorcycle.color || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Kilometer</span>
                <span>{{ motorcycle.mileage?.toLocaleString() || '-' }} KM</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Kondisi</span>
                <span>{{ motorcycle.condition }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Currency</span>
                <span class="badge">{{ motorcycle.currency }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Owner Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-lg">Pemilik Asal</h2>
            <div class="space-y-3 mt-2">
              <div class="flex justify-between">
                <span class="text-base-content/60">Nama</span>
                <span>{{ motorcycle.ownerName || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Telepon</span>
                <span>{{ motorcycle.ownerPhone || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Lokasi</span>
                <span>{{ motorcycle.ownerLocation || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-lg">Keuangan</h2>
            <div class="space-y-3 mt-2">
              <div class="flex justify-between items-center">
                <span class="text-base-content/60">HPP</span>
                <span class="text-xl font-bold text-primary">
                  {{ formatCurrency(motorcycle.totalCost, motorcycle.currency) }}
                </span>
              </div>
              <div v-if="motorcycle.sellingPrice" class="flex justify-between items-center">
                <span class="text-base-content/60">Harga Jual</span>
                <span class="text-xl font-bold text-success">
                  {{ formatCurrency(motorcycle.sellingPrice, motorcycle.currency) }}
                </span>
              </div>
              <div v-if="motorcycle.profit" class="flex justify-between items-center">
                <span class="text-base-content/60">Profit</span>
                <span :class="['text-xl font-bold', motorcycle.profit >= 0 ? 'text-success' : 'text-error']">
                  {{ formatCurrency(motorcycle.profit, motorcycle.currency) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="motorcycle.notes" class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg">Catatan</h2>
          <p class="whitespace-pre-wrap">{{ motorcycle.notes }}</p>
        </div>
      </div>

      <!-- Costs Section -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title text-lg">
              Riwayat Biaya
              <span class="badge badge-primary">{{ motorcycle.costs?.length || 0 }}</span>
            </h2>
            <button
              v-if="motorcycle.status !== 'SOLD'"
              @click="showCostModal = true"
              class="btn btn-primary btn-sm"
            >
              <IconPlus class="w-4 h-4 mr-1" :stroke-width="1.5" />
              Tambah Biaya
            </button>
          </div>

          <div v-if="motorcycle.costs?.length" class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Deskripsi</th>
                  <th>Bayar</th>
                  <th class="text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cost in motorcycle.costs" :key="cost.id">
                  <td>{{ new Date(cost.transactionDate).toLocaleDateString('id-ID') }}</td>
                  <td>
                    <span class="badge badge-outline">{{ cost.component }}</span>
                  </td>
                  <td>{{ cost.description }}</td>
                  <td>{{ cost.paymentMethod || '-' }}</td>
                  <td class="text-right font-mono">
                    {{ formatCurrency(cost.amount, cost.currency) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="4">Total HPP</th>
                  <th class="text-right text-primary text-lg">
                    {{ formatCurrency(motorcycle.totalCost, motorcycle.currency) }}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-else class="text-center py-8 text-base-content/40">
            Belum ada biaya tercatat
          </div>
        </div>
      </div>

      <!-- Sale Transaction -->
      <div v-if="motorcycle.saleTransaction" class="card bg-success/10 border border-success/20">
        <div class="card-body">
          <h2 class="card-title text-lg text-success">Transaksi Penjualan</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <span class="text-base-content/60">Pembeli</span>
              <p class="font-bold">{{ motorcycle.saleTransaction.buyerName }}</p>
              <p class="text-sm">{{ motorcycle.saleTransaction.buyerPhone }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Tanggal Jual</span>
              <p class="font-bold">{{ new Date(motorcycle.saleTransaction.saleDate).toLocaleDateString('id-ID') }}</p>
              <p class="text-sm">{{ motorcycle.saleTransaction.paymentMethod }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Profit</span>
              <p :class="['text-2xl font-bold', motorcycle.saleTransaction.profit >= 0 ? 'text-success' : 'text-error']">
                {{ formatCurrency(motorcycle.saleTransaction.profit, motorcycle.saleTransaction.currency) }}
              </p>
              <p class="text-sm">Margin: {{ motorcycle.saleTransaction.profitMargin?.toFixed(1) }}%</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Cost Modal -->
    <dialog :class="['modal', showCostModal && 'modal-open']">
      <div class="modal-box bg-base-200">
        <h3 class="font-bold text-lg mb-4">Tambah Biaya</h3>
        <form @submit.prevent="addCost" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Kategori *</span></label>
            <select v-model="costForm.component" class="select select-bordered bg-base-300" required>
              <option v-for="c in costComponents" :key="c.value" :value="c.value">
                {{ c.label }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Deskripsi *</span></label>
            <input v-model="costForm.description" type="text" class="input input-bordered bg-base-300" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Jumlah *</span></label>
              <input v-model="costForm.amount" type="number" step="0.01" class="input input-bordered bg-base-300" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Currency</span></label>
              <select v-model="costForm.currency" class="select select-bordered bg-base-300">
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Metode Bayar</span></label>
            <select v-model="costForm.paymentMethod" class="select select-bordered bg-base-300">
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Transfer</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="showCostModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Simpan
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showCostModal = false">close</button>
      </form>
    </dialog>

    <!-- Sell Modal -->
    <dialog :class="['modal', showSellModal && 'modal-open']">
      <div class="modal-box bg-base-200 max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Jual Motor</h3>
        <form @submit.prevent="sellMotorcycle" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Harga Jual *</span></label>
              <input v-model="sellForm.sellingPrice" type="number" step="0.01" class="input input-bordered bg-base-300" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Currency</span></label>
              <select v-model="sellForm.currency" class="select select-bordered bg-base-300">
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Nama Pembeli *</span></label>
            <input v-model="sellForm.buyerName" type="text" class="input input-bordered bg-base-300" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">No. Telepon</span></label>
              <input v-model="sellForm.buyerPhone" type="tel" class="input input-bordered bg-base-300" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Metode Bayar</span></label>
              <select v-model="sellForm.paymentMethod" class="select select-bordered bg-base-300">
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Transfer</option>
                <option value="INSTALLMENT">Cicilan</option>
              </select>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Alamat</span></label>
            <textarea v-model="sellForm.buyerAddress" class="textarea textarea-bordered bg-base-300"></textarea>
          </div>
          <div class="alert alert-info">
            <IconInfoCircle class="w-6 h-6 shrink-0" :stroke-width="1.5" />
            <div>
              <p>HPP Motor: <strong>{{ formatCurrency(motorcycle?.totalCost || 0, motorcycle?.currency) }}</strong></p>
              <p v-if="sellForm.sellingPrice">
                Estimasi Profit: 
                <strong :class="parseFloat(sellForm.sellingPrice) - (motorcycle?.totalCost || 0) >= 0 ? 'text-success' : 'text-error'">
                  {{ formatCurrency(parseFloat(sellForm.sellingPrice) - (motorcycle?.totalCost || 0), sellForm.currency) }}
                </strong>
              </p>
            </div>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="showSellModal = false">Batal</button>
            <button type="submit" class="btn btn-success" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Konfirmasi Penjualan
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showSellModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>
